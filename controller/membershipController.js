import Membership from '../models/Membership.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import mongoose from 'mongoose';

// Membership fee structure
const MEMBERSHIP_FEES = {
  'student-ug': 250,      // Undergraduate students - ₹250
  'student-pg': 350,      // Postgraduate students - ₹350
  'academic': 500,        // Academic/Faculty - ₹500
  'industry': 750,        // Industry professionals - ₹750
  'international': 600    // International members (non-Indian) - ₹600
};

// Helper function to normalize membership type
const normalizeMembershipType = (type) => {
  const typeMap = {
    'student': 'student-ug', // Default student to UG
    'professional': 'academic',
    'corporate': 'industry'
  };
  
  return typeMap[type] || type;
};

// Helper function to parse membership fee
const parseMembershipFee = (fee, membershipType) => {
  // If fee is not provided, get from fee structure
  if (!fee) {
    return MEMBERSHIP_FEES[membershipType] || 0;
  }
  
  // If fee is a string, remove currency symbols and convert to number
  if (typeof fee === 'string') {
    const cleanFee = fee.replace(/[₹$,\s]/g, '');
    const numericFee = parseInt(cleanFee, 10);
    return isNaN(numericFee) ? MEMBERSHIP_FEES[membershipType] || 0 : numericFee;
  }
  
  // If already a number, return as is
  return parseInt(fee, 10);
};

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
    
    // Normalize membership type (convert old values to new enum values)
    const normalizedMembershipType = normalizeMembershipType(req.body.membershipType);
    
    // Validate membership type
    const validTypes = ['student-ug', 'student-pg', 'academic', 'industry', 'international'];
    if (!validTypes.includes(normalizedMembershipType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid membership type. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    // Parse and validate membership fee
    const membershipFee = parseMembershipFee(req.body.membershipFee, normalizedMembershipType);

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
      membershipType: normalizedMembershipType, // Use normalized type
      membershipFee: membershipFee, // Use parsed numeric fee
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
    
    // Return membership with approval status
    res.status(200).json({
      success: true,
      membership,
      isAdminApproved: membership.isAdminApproved || false,
      canViewCard: membership.isAdminApproved && membership.active
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

// Get membership by ID - Public route (but restricted based on approval)
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
    
    // Check if membership is approved by admin
    if (!membership.isAdminApproved) {
      return res.status(403).json({
        success: false,
        message: 'Membership is pending admin approval. You cannot view membership details until approved.',
        status: 'pending_approval',
        paymentStatus: membership.paymentStatus
      });
    }
    
    // Return the membership data only if approved
    res.status(200).json({
      success: true,
      membership,
      isApproved: true
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
      active: membership ? membership.active : false,
      isAdminApproved: membership ? membership.isAdminApproved : false
    });
  } catch (error) {
    console.error('Error validating membership:', error);
    res.status(500).json({
      valid: false,
      message: 'Error validating membership'
    });
  }
};

// Check membership approval status
export const checkApprovalStatus = async (req, res) => {
  try {
    const { membershipId, email } = req.query;
    
    let membership;
    
    if (membershipId) {
      membership = await Membership.findOne({ membershipId });
      if (!membership && mongoose.Types.ObjectId.isValid(membershipId)) {
        membership = await Membership.findById(membershipId);
      }
    } else if (email) {
      membership = await Membership.findOne({ email }).sort({ createdAt: -1 });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide either membershipId or email'
      });
    }
    
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership not found'
      });
    }
    
    res.json({
      success: true,
      status: {
        isAdminApproved: membership.isAdminApproved || false,
        paymentStatus: membership.paymentStatus,
        active: membership.active,
        canViewCard: (membership.isAdminApproved && membership.active) || false,
        approvedAt: membership.approvedAt,
        adminRemarks: membership.adminRemarks || '',
        membershipId: membership.isAdminApproved ? membership.membershipId : null // Only show ID if approved
      }
    });
  } catch (error) {
    console.error('Error checking approval status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking approval status'
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