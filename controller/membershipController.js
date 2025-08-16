import Membership from '../models/Membership.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

// Register new membership
export const registerMembership = async (req, res) => {
  try {
    console.log('=============== REGISTER MEMBERSHIP ===============');
    console.log('Request headers:', req.headers.authorization ? 'Auth header present' : 'No auth header');
    
    // Full logging of the user object
    if (req.user) {
      console.log('User from request:', JSON.stringify(req.user, null, 2));
    } else {
      console.log('No user object in request');
    }
    
    // Validate required fields
    const requiredFields = [
      'firstName', 
      'lastName', 
      'email', 
      'organisation', 
      'town', 
      'country', 
      'status',
      'membershipType'
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Generate a unique membership ID
    const membershipIdPrefix = 'SOCCOS';
    const date = new Date();
    const yearShort = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    
    const generatedMembershipId = `${membershipIdPrefix}-${yearShort}${month}-${randomDigits}`;
    
    // Create membership data object with properly formatted user ID
    const membershipData = {
      ...req.body,
      membershipId: generatedMembershipId,
      issueDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    };
    
    // Handle user ID assignment with better debug logging
    if (req.user) {
      // Try both possible formats for the ID
      if (req.user._id) {
        console.log('Setting userId from req.user._id:', req.user._id);
        membershipData.userId = req.user._id;
      } else if (req.user.id) {
        console.log('Setting userId from req.user.id:', req.user.id);
        membershipData.userId = req.user.id;
      } else {
        console.log('User object exists but no valid ID found:', Object.keys(req.user));
      }
    } else {
      console.log('No user object in request - membership will not be linked to user');
    }
    
    console.log('Final membershipData userId:', membershipData.userId || 'Not set');
    
    // Create and save the membership
    const membership = new Membership(membershipData);
    const savedMembership = await membership.save();
    
    // Double-check that the user ID was saved
    console.log('Membership saved. Was userId stored?', {
      userIdBeforeSave: membershipData.userId ? 'Yes' : 'No',
      userIdAfterSave: savedMembership.userId ? 'Yes' : 'No',
      userId: savedMembership.userId || 'Not stored'
    });
    
    res.status(201).json({
      success: true,
      message: 'Membership registered successfully',
      membershipId: savedMembership.membershipId,
      membership: savedMembership
    });
    
  } catch (error) {
    console.error('Membership registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to register membership'
    });
  }
};

// Fix the getMembershipByEmail function
export const getMembershipByEmail = async (req, res) => {
  try {
    console.log('Getting membership for email:', req.params.email);
    
    const email = req.params.email;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find membership by email
    const membership = await Membership.findOne({ 
      email: email 
    }).sort({ createdAt: -1 });
    
    console.log('Membership found for email:', email, membership ? 'Yes' : 'No');
    
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'No membership found for this email'
      });
    }
    
    res.status(200).json({
      success: true,
      membership
    });
  } catch (error) {
    console.error('Error in getMembershipByEmail:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving membership information'
    });
  }
};

// Fix the getCurrentMembership function
export const getCurrentMembership = async (req, res) => {
  try {
    console.log('Getting current membership, user:', req.user);
    
    // Try to find by userId first
    let membership = null;
    if (req.user && req.user._id) {
      membership = await Membership.findOne({ 
        userId: req.user._id 
      }).sort({ createdAt: -1 });
    }
    
    // If not found and we have the user's email, try that
    if (!membership && req.user && req.user.email) {
      membership = await Membership.findOne({ 
        email: req.user.email 
      }).sort({ createdAt: -1 });
    }
    
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'No membership found for current user'
      });
    }
    
    res.status(200).json({
      success: true,
      membership
    });
  } catch (error) {
    console.error('Error in getCurrentMembership:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving membership information'
    });
  }
};

// Add membership upgrade endpoint
export const upgradeMembership = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user._id;
    
    if (!planId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Find current membership
    const currentMembership = await Membership.findOne({ 
      userId: userId 
    }).sort({ createdAt: -1 });
    
    // Determine membership type and price based on planId
    let membershipType, price;
    switch(planId) {
      case 'student':
        membershipType = 'Student';
        price = 500;
        break;
      case 'professional':
        membershipType = 'Professional';
        price = 2000;
        break;
      case 'corporate':
        membershipType = 'Corporate';
        price = 10000;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid plan type'
        });
    }
    
    // Create new membership or update existing one
    if (currentMembership) {
      currentMembership.membershipType = membershipType;
      currentMembership.status = 'active';
      currentMembership.membershipFee = price;
      currentMembership.updatedAt = new Date();
      
      await currentMembership.save();
      
      res.status(200).json({
        success: true,
        message: 'Membership upgraded successfully',
        membership: currentMembership
      });
    } else {
      // Create new membership if none exists
      const newMembership = new Membership({
        userId,
        membershipType,
        status: 'active',
        membershipFee: price,
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      });
      
      await newMembership.save();
      
      res.status(201).json({
        success: true,
        message: 'New membership created successfully',
        membership: newMembership
      });
    }
  } catch (error) {
    console.error('Error upgrading membership:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error upgrading membership'
    });
  }
};

// Get membership by ID - Public route
export const getMembershipById = async (req, res) => {
  try {
    const membershipId = req.params.id;
    console.log('Getting membership by ID:', membershipId);
    
    if (!membershipId) {
      return res.status(400).json({
        success: false,
        message: 'Membership ID is required'
      });
    }

    // Try to find by membershipId first
    let membership = await Membership.findOne({ membershipId });
    
    // If not found, try to treat it as MongoDB _id
    if (!membership && mongoose.Types.ObjectId.isValid(membershipId)) {
      membership = await Membership.findById(membershipId);
    }
    
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'No membership found with the provided ID'
      });
    }
    
    // Return the membership data
    res.status(200).json({
      success: true,
      membership
    });
  } catch (error) {
    console.error('Error in getMembershipById:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving membership information'
    });
  }
};

// Validate membership by ID - Public route
export const validateMembership = async (req, res) => {
  try {
    const membershipId = req.params.id;
    
    if (!membershipId) {
      return res.json({
        valid: false,
        message: 'No membership ID provided'
      });
    }
    
    // Try to find by membershipId first
    let membership = await Membership.findOne({ membershipId });
    
    // If not found, try to treat it as MongoDB _id
    if (!membership && mongoose.Types.ObjectId.isValid(membershipId)) {
      membership = await Membership.findById(membershipId);
    }
    
    // Return validation result
    res.json({
      valid: !!membership,
      active: membership ? membership.active : false
    });
  } catch (error) {
    console.error('Error validating membership:', error);
    res.status(500).json({
      valid: false,
      message: 'Error validating membership'
    });
  }
};

// Modify the handleSubmit function in MembershipForm.tsx
const handleSubmit = async () => {
  setLoading(true);
  try {
    // Validate required fields
    const requiredFields = [
      'firstName', 
      'lastName', 
      'email', 
      'organisation', 
      'town', 
      'country', 
      'status',
      'membershipType'
    ];

    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
    }

    // Add membership fee based on selected type
    const selectedTier = membershipTiers.find(tier => tier.id === formData.membershipType);
    const membershipFee = selectedTier?.price || '';

    const membershipData = {
      ...formData,
      membershipFee,
      paymentStatus: 'completed', // You might want to handle actual payment processing
      issueDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    };

    const response = await axios.post('${import.meta.env.VITE_API_URL}/api/membership', membershipData);

    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Membership Registered!',
        // Check if membershipId exists in the response, otherwise use a generic message
        text: response.data.membershipId 
          ? `Your membership ID is: ${response.data.membershipId}`
          : 'Your membership application has been submitted successfully',
        confirmButtonColor: '#dc2626',
      });
      navigate('/profile');
    } else {
      throw new Error(response.data.message || 'Failed to submit membership application');
    }
  } catch (error) {
    console.error('Membership submission error:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Submission Failed',
      text: error.response?.data?.message || error.message,
      confirmButtonColor: '#dc2626',
    });
  } finally {
    setLoading(false);
  }
};