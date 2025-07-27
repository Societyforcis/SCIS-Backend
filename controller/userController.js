import User from '../models/User.js';
import Profile from '../models/Profile.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { sendVerificationEmail, sendOTPEmail } from './utils/email.js';
dotenv.config();

const secret = process.env.JWT_SECRET;

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        console.log("Login attempt for:", email);
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log("User not found:", email);
            return res.status(400).json({ success: false, message: "User does not exist" });
        }

        console.log("User found, verifying password");
        
        // Debug info - DO NOT include in production
        console.log("Password verification debugging:", {
            emailRequested: email,
            hasStoredPassword: !!user.password,
            passwordLength: user.password ? user.password.length : 0
        });
        
        // Use bcrypt.compare directly for consistent comparison
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            console.log("Password mismatch for user:", email);
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        // Block login for unverified accounts
        if (!user.isVerified) {
            // Regenerate OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.verificationOTP = otp;
            user.verificationOTPExpires = Date.now() + 10 * 60 * 1000;
            await user.save();
            await sendOTPEmail(email, otp);
            console.log("User not verified, sent new OTP");
            return res.status(403).json({ success: false, message: "VERIFY_OTP" });
        }

        const token = jwt.sign(
            { 
                id: user._id,
                email: user.email, 
                isAdmin: user.isAdmin || email === 'societyforcis.org@gmail.com'
            }, 
            secret, 
            { expiresIn: '24h' }
        );
        
        console.log("Login successful for:", email);
        res.status(200).json({ 
            success: true, 
            token,
            user: { 
                _id: user._id,
                email: user.email,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                isAdmin: user.isAdmin || email === 'societyforcis.org@gmail.com',
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Error logging in user" });
    }
};

export const signin = async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: "User already exists" 
            });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + (30 * 60 * 1000); // 30 minutes
        
        // Create new user
        // NOTE: We're NOT pre-hashing the password - let the mongoose pre-save hook handle it
        const newUser = new User({ 
            email, 
            password, // This will be hashed by the pre-save hook
            firstName: firstName || '',
            lastName: lastName || '',
            isVerified: false,
            verificationOTP: otp, 
            verificationOTPExpires: otpExpires 
        });
        
        await newUser.save();
        
        // Log created user data for debugging (minus the password)
        console.log('New user created with OTP:', {
            userId: newUser._id,
            email: newUser.email,
            otp: otp,
            expiryTime: new Date(otpExpires),
            passwordSaved: !!newUser.password // just log if it exists, not the value
        });
        
        await sendOTPEmail(email, otp);
        
        return res.status(201).json({ 
            success: true, 
            otpSent: true, 
            email: email,
            message: "OTP sent to your email for verification." 
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ 
            success: false, 
            message: "An error occurred during registration", 
            error: error.message 
        });
    }
};

export const verifyEmail = async (req, res) => {
    return res.status(410).json({ success: false, message: "Deprecated endpoint" });
};

export const verifyAccountOTP = async (req, res) => {
    const { email, otp } = req.body;
    
    try {
        // Validate input
        if (!email || !otp) {
            return res.status(400).json({ 
                success: false, 
                message: "Email and OTP are required" 
            });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }
        
        console.log('Verification attempt details:', {
            email,
            receivedOTP: otp,
            storedOTP: user.verificationOTP,
            expiryTime: user.verificationOTPExpires,
            currentTime: new Date()
        });
        
        // Verify OTP
        if (user.verificationOTP !== otp) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid OTP. Please check and try again" 
            });
        }
        
        if (!user.verificationOTPExpires || user.verificationOTPExpires < Date.now()) {
            return res.status(400).json({ 
                success: false, 
                message: "OTP has expired. Please request a new one" 
            });
        }
        
        if (user.isVerified) {
            return res.status(400).json({ 
                success: false, 
                message: "Account is already verified" 
            });
        }

        // Update user verification status WITHOUT touching the password
        user.isVerified = true;
        user.verificationOTP = undefined;
        user.verificationOTPExpires = undefined;
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({ 
            success: true, 
            token,
            user: {
                _id: user._id,
                email: user.email,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                isAdmin: user.isAdmin,
                isVerified: true
            }
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Error verifying OTP",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    
    // Add validation
    if (!email) {
        return res.status(400).json({ 
            success: false, 
            message: "Email is required" 
        });
    }
    
    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Update user document with new OTP
        await User.findByIdAndUpdate(user._id, {
            resetOTP: otp,
            resetOTPExpires: Date.now() + (30 * 60 * 1000) // 30 minutes instead of 10
        });
        
        // Send the email
        await sendOTPEmail(email, otp);
        
        // Log for debugging
        console.log('Password reset OTP generated:', {
            email,
            otp,
            expires: new Date(Date.now() + (30 * 60 * 1000))
        });
        
        res.json({ 
            success: true, 
            message: "OTP sent to email" 
        });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ 
            success: false, 
            message: "Error sending OTP",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  
  // Add detailed logging to debug the request
  console.log('Verify OTP request received:', { 
    email, 
    otp: otp ? otp : 'missing',
    body: req.body 
  });
  
  // Validate input
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: "Email is required" 
    });
  }
  
  if (!otp) {
    return res.status(400).json({ 
      success: false, 
      message: "OTP is required" 
    });
  }
  
  try {
    // Find user with matching email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    // Log the OTP check for debugging
    console.log('OTP verification attempt:', {
      userEmail: user.email,
      providedOTP: otp,
      storedOTP: user.resetOTP,
      otpExpiry: user.resetOTPExpires,
      currentTime: new Date(),
      isExpired: user.resetOTPExpires ? user.resetOTPExpires < Date.now() : true,
      difference: user.resetOTPExpires ? (user.resetOTPExpires.getTime() - Date.now()) / 1000 + ' seconds' : 'N/A'
    });
    
    // Check if OTP matches and is not expired with more detailed error messages
    if (!user.resetOTP) {
      return res.status(400).json({ 
        success: false, 
        message: "No OTP requested. Please use 'Forgot Password' first" 
      });
    }
    
    if (user.resetOTP !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid OTP. Please check and try again" 
      });
    }
    
    if (!user.resetOTPExpires || user.resetOTPExpires < Date.now()) {
      return res.status(400).json({ 
        success: false, 
        message: "OTP has expired. Please request a new one" 
      });
    }
    
    // OTP is valid
    res.json({ 
      success: true, 
      message: "OTP verified successfully",
      email: user.email
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: "Error verifying OTP",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and new password are required" 
      });
    }
    
    try {
        // First check if user exists
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }
        
        // Log for debugging
        console.log('Reset password attempt:', {
            email,
            hasResetOTP: !!user.resetOTP,
            resetOTPExpires: user.resetOTPExpires,
            currentTime: new Date(),
            isExpired: user.resetOTPExpires ? user.resetOTPExpires < Date.now() : true
        });
        
        // Check if reset OTP exists and is not expired
        if (!user.resetOTP) {
            return res.status(400).json({ 
                success: false, 
                message: "Password reset not initiated. Please use forgot password first." 
            });
        }
        
        if (!user.resetOTPExpires || user.resetOTPExpires < Date.now()) {
            return res.status(400).json({ 
                success: false, 
                message: "Reset link has expired. Please request a new one." 
            });
        }

        // Update the password
        const hash = await bcrypt.hash(newPassword, 10);
        
        // Update user with new password and clear OTP fields
        await User.findByIdAndUpdate(user._id, {
            password: hash,
            resetOTP: null,
            resetOTPExpires: null
        });
        
        res.json({ 
            success: true, 
            message: "Password reset successful" 
        });
    } catch (error) {
        console.error("Password reset error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error resetting password", 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


export const getProfile = async (req, res) => {
  try {
    console.log('Getting profile for user:', req.user); // Debug log
    
    // Get user ID from req.user
    const userId = req.user._id || req.user.id;
    
    if (!userId) {
      console.error('No user ID found in request');
      return res.status(400).json({ 
        success: false, 
        message: "Invalid user ID" 
      });
    }
    
    // Find user profile
    let profile = await Profile.findOne({ userId });
    
    // If no profile exists yet, return user data from User model
    if (!profile) {
      console.log('No profile found, fetching user data');
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        console.error('User not found with ID:', userId);
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        profile: {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          profilePicture: user.profilePicture || '',
          phone: '',
          address: '',
          bio: ''
        }
      });
    }
    
    console.log('Profile found:', profile);
    
    // Return profile data
    return res.status(200).json({ 
      success: true, 
      profile 
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching profile data",
      error: error.message
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, address, bio, profilePicture } = req.body;
    
    // First check if user exists
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedProfile = await Profile.findOneAndUpdate(
      { userId: user._id },
      {
        firstName,
        lastName,
        email: user.email, // Use user's email
        phone,
        address,
        bio,
        profilePicture,
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      profile: {
        ...updatedProfile.toObject(),
        email: user.email // Always use user's email
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

export const uploadProfilePicture = async (req, res) => {
    try {
        const { email } = req.user;
        const { profilePicture } = req.body; // Base64 encoded image
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        let profile = await Profile.findOne({ userId: user._id });
        
        // If no profile exists, create one
        if (!profile) {
            profile = new Profile({ userId: user._id });
        }

        profile.profilePicture = profilePicture;
        await profile.save();
        
        res.json({ success: true, message: "Profile picture updated successfully", profile });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error uploading profile picture", error: error.message });
    }
};

export const checkProfileCompletion = async (req, res) => {
    try {
        const { email } = req.user;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const profile = await Profile.findOne({ userId: user._id });
        const isComplete = profile?.isProfileComplete || false;
        
        res.json({ success: true, isProfileComplete: isComplete });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error checking profile completion", error: error.message });
    }
};

export const verifyToken = async (req, res) => {
  try {
    console.log('Verifying token for user:', req.user); // Debug log

    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      console.log('User not found with id:', req.user.id); // Debug log
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate fresh token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Token verified successfully for:', user.email); // Debug log

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified
      },
      token
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying token'
    });
  }
};

// Google Sign Up
export const googleSignup = async (req, res) => {
  try {
    const { email, firstName, lastName, googleId, profilePicture } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
        email
      });
    }

    // Create new user without password for Google auth
    user = new User({
      email,
      firstName,
      lastName,
      googleId,
      profilePicture,
      isVerified: true,
      isAdmin: email === 'societyforcis.org@gmail.com'
    });

    await user.save();

    // Create profile for the user
    await Profile.create({
      userId: user._id,
      firstName,
      lastName,
      email,
      profilePicture
    });

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isVerified: true,
        profilePicture: user.profilePicture
      },
      token
    });

  } catch (error) {
    console.error('Google signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during Google signup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Google Sign In (Registration)
export const googleSignIn = async (req, res) => {
  try {
    const { email, googleId, firstName, lastName, profilePicture } = req.body;
    
    console.log('Google sign-in request received:', { email, googleId });
    
    // Validate required fields
    if (!email || !googleId) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and Google ID are required" 
      });
    }
    
    // Check if user already exists with this email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        code: 'EXISTING_ACCOUNT',
        message: "User with this email already exists", 
        existingEmail: email
      });
    }
    
    // Create new user with Google authentication
    const newUser = new User({
      email,
      googleId,
      firstName: firstName || email.split('@')[0],
      lastName: lastName || '',
      profilePicture: profilePicture || null,
      // Google-authenticated users are automatically verified
      isVerified: true
      // Notice: No password is set for Google users
    });
    
    await newUser.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: newUser._id, 
        email: newUser.email,
        isAdmin: newUser.isAdmin 
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Google sign-in successful, user created:', {
      id: newUser._id,
      email: newUser.email
    });
    
    // Return success with token and user data
    res.status(201).json({
      success: true,
      token,
      user: {
        _id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        isAdmin: newUser.isAdmin,
        isVerified: true
      }
    });
    
  } catch (error) {
    console.error('Google sign in error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Error creating user with Google credentials",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Google Login
export const googleLogin = async (req, res) => {
  try {
    const { email, googleId, firstName, lastName, profilePicture } = req.body;
    
    if (!email || !googleId) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and Google ID are required" 
      });
    }
    
    // Find user by email
    let user = await User.findOne({ email });
    
    // If no user found, create a new account with Google
    if (!user) {
      // Create new user with Google authentication
      user = new User({
        email,
        googleId,
        firstName: firstName || email.split('@')[0],
        lastName: lastName || '',
        profilePicture: profilePicture || null,
        isVerified: true // Google-authenticated users are automatically verified
      });
      
      await user.save();
      console.log('New Google user created during login:', { email });
    } else {
      // If user exists but no googleId, update it
      if (!user.googleId) {
        user.googleId = googleId;
        // Also update profile info if provided
        if (firstName && !user.firstName) user.firstName = firstName;
        if (lastName && !user.lastName) user.lastName = lastName;
        if (profilePicture && !user.profilePicture) user.profilePicture = profilePicture;
        
        await user.save();
        console.log('Updated existing user with Google ID:', { email });
      }
      
      // Ensure user is verified (Google users should always be verified)
      if (!user.isVerified) {
        user.isVerified = true;
        await user.save();
        console.log('Marked existing user as verified:', { email });
      }
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        isAdmin: user.isAdmin 
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Google login successful for:', {
      id: user._id,
      email: user.email
    });
    
    // Return success with token and user data
    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        isAdmin: user.isAdmin,
        isVerified: true
      }
    });
    
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Error logging in with Google",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  const { email } = req.body;
  
  // Validate input
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: "Email is required" 
    });
  }
  
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update user with new OTP
    await User.findByIdAndUpdate(user._id, {
      resetOTP: otp,
      resetOTPExpires: Date.now() + (30 * 60 * 1000) // 30 minutes
    });
    
    // Send the OTP email
    await sendOTPEmail(email, otp);
    
    // Log for debugging
    console.log('New OTP generated:', {
      email,
      otp,
      expires: new Date(Date.now() + (30 * 60 * 1000))
    });

    res.json({
      success: true,
      message: "New OTP has been sent to your email"
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: "Error sending new OTP",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const resendVerificationOTP = async (req, res) => {
  const { email } = req.body;
  
  // Validate input
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: "Email is required" 
    });
  }
  
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Account is already verified"
      });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update user with new verification OTP
    user.verificationOTP = otp;
    user.verificationOTPExpires = Date.now() + (30 * 60 * 1000); // 30 minutes
    await user.save();
    
    // Send the OTP email
    await sendOTPEmail(email, otp);
    
    // Log for debugging
    console.log('New verification OTP generated:', {
      email,
      otp,
      expires: new Date(Date.now() + (30 * 60 * 1000))
    });

    res.json({
      success: true,
      message: "New verification OTP has been sent to your email"
    });
  } catch (error) {
    console.error('Resend verification OTP error:', error);
    res.status(500).json({
      success: false,
      message: "Error sending new verification OTP",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


import Notification from '../models/Notification.js';

// Get notifications for a user
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      recipient: req.user._id 
    }).sort({ createdAt: -1 });

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching notifications" 
    });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id, 
        recipient: req.user._id 
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: "Notification not found" 
      });
    }

    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error updating notification" 
    });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ 
      _id: req.params.id, 
      recipient: req.user._id 
    });

    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: "Notification not found" 
      });
    }

    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error deleting notification" 
    });
  }
};

// Admin: Create notification for specific users or all users
export const createNotification = async (req, res) => {
  try {
    const { recipients, title, message, type, link } = req.body;

    // Check if admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized" 
      });
    }

    let users;
    if (recipients === 'all') {
      users = await User.find({ isAdmin: false }).select('_id');
    } else if (Array.isArray(recipients)) {
      users = await User.find({ 
        _id: { $in: recipients }, 
        isAdmin: false 
      }).select('_id');
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid recipients" 
      });
    }

    const notifications = users.map(user => ({
      recipient: user._id,
      title,
      message,
      type: type || 'admin',
      link
    }));

    await Notification.insertMany(notifications);

    res.json({ 
      success: true, 
      message: `Notifications sent to ${users.length} users` 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error creating notifications" 
    });
  }
};

// Admin: Get all notifications
export const getAllNotifications = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized" 
      });
    }

    const notifications = await Notification.find()
      .populate('recipient', 'email firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching notifications" 
    });
  }
};