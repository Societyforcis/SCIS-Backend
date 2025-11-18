import BookingMembership from '../models/BookingMembership.js';
import Membership from '../models/Membership.js';
import { sendMembershipApprovalEmail } from './utils/email.js';
import { v2 as cloudinary } from 'cloudinary';

// Membership fee structure
const MEMBERSHIP_FEES = {
  'student-ug': 250,
  'student-pg': 350,
  'academic': 500,
  'industry': 750,
  'international': 600
};

// Helper function to normalize membership type
const normalizeMembershipType = (type) => {
  const typeMap = {
    'student': 'student-ug',
    'professional': 'academic',
    'corporate': 'industry'
  };
  return typeMap[type] || type;
};

// Helper function to parse membership fee
const parseMembershipFee = (fee, membershipType) => {
  if (!fee) {
    return MEMBERSHIP_FEES[membershipType] || 0;
  }
  
  if (typeof fee === 'string') {
    const cleanFee = fee.replace(/[₹$,\s]/g, '');
    const numericFee = parseInt(cleanFee, 10);
    return isNaN(numericFee) ? MEMBERSHIP_FEES[membershipType] || 0 : numericFee;
  }
  
  return parseInt(fee, 10);
};

// Submit booking membership with payment details
export const submitBookingMembership = async (req, res) => {
  try {
    console.log('=============== SUBMIT BOOKING MEMBERSHIP ===============');
    
    // Validate required fields
    const requiredFields = [
      'firstName', 
      'lastName', 
      'email', 
      'organisation', 
      'town', 
      'country', 
      'status',
      'membershipType',
      'paymentMethod',
      'paymentStatus'
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`
        });
      }
    }
    
    // Check if user already has a pending booking
    const existingBooking = await BookingMembership.findOne({
      email: req.body.email,
      bookingStatus: 'pending'
    });
    
    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending membership booking. Please wait for admin approval.'
      });
    }
    
    // Check if user already has an active membership
    const existingMembership = await Membership.findOne({
      email: req.body.email,
      active: true
    });
    
    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active membership.'
      });
    }
    
    // Normalize membership type
    const normalizedMembershipType = normalizeMembershipType(req.body.membershipType);
    
    // Parse membership fee
    const membershipFee = parseMembershipFee(req.body.membershipFee, normalizedMembershipType);
    
    // Handle payment screenshot upload if provided
    let paymentScreenshotUrl = null;
    if (req.body.paymentScreenshot) {
      try {
        const uploadResult = await cloudinary.uploader.upload(req.body.paymentScreenshot, {
          folder: 'scis/payment-screenshots',
          transformation: [
            { width: 1000, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        });
        paymentScreenshotUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Error uploading payment screenshot:', uploadError);
      }
    }
    
    // Create booking data
    const bookingData = {
      ...req.body,
      membershipType: normalizedMembershipType,
      membershipFee: membershipFee,
      paymentScreenshot: paymentScreenshotUrl,
      paymentDate: req.body.paymentStatus === 'paid' ? new Date() : null,
      userId: req.user?._id || null
    };
    
    // Create and save booking
    const booking = new BookingMembership(bookingData);
    const savedBooking = await booking.save();
    
    console.log('Booking created successfully:', savedBooking._id);
    
    res.status(201).json({
      success: true,
      message: 'Membership booking submitted successfully. Please wait for admin approval.',
      booking: savedBooking,
      bookingId: savedBooking._id
    });
    
  } catch (error) {
    console.error('Booking submission error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit booking'
    });
  }
};

// Get all booking memberships (Admin only)
export const getAllBookingMemberships = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = {};
    if (status) {
      query.bookingStatus = status;
    }
    
    const bookings = await BookingMembership.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'email firstName lastName');
    
    res.status(200).json({
      success: true,
      bookings,
      total: bookings.length
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};

// Get booking by ID (Admin only)
export const getBookingById = async (req, res) => {
  try {
    const booking = await BookingMembership.findById(req.params.id)
      .populate('userId', 'email firstName lastName')
      .populate('approvedBy', 'email firstName lastName');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking'
    });
  }
};

// Get user's booking status
export const getUserBookingStatus = async (req, res) => {
  try {
    const userId = req.user?._id;
    const email = req.user?.email || req.params.email;
    
    if (!userId && !email) {
      return res.status(400).json({
        success: false,
        message: 'User ID or email is required'
      });
    }
    
    const query = userId ? { userId } : { email };
    const booking = await BookingMembership.findOne(query)
      .sort({ createdAt: -1 });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'No booking found'
      });
    }
    
    res.status(200).json({
      success: true,
      booking,
      status: booking.bookingStatus,
      paymentStatus: booking.paymentStatus
    });
  } catch (error) {
    console.error('Error fetching user booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking status'
    });
  }
};

// Approve booking and create membership (Admin only)
export const approveBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { adminRemarks } = req.body;
    
    // Find the booking
    const booking = await BookingMembership.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    if (booking.bookingStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Booking already approved'
      });
    }
    
    // Generate membership ID
    const membershipIdPrefix = 'SOCCOS';
    const date = new Date();
    const yearShort = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const generatedMembershipId = `${membershipIdPrefix}-${yearShort}${month}-${randomDigits}`;
    
    // Create membership from booking data
    const membershipData = {
      title: booking.title,
      firstName: booking.firstName,
      lastName: booking.lastName,
      email: booking.email,
      mobile: booking.mobile,
      currentPosition: booking.currentPosition,
      institute: booking.institute,
      department: booking.department,
      organisation: booking.organisation,
      address: booking.address,
      town: booking.town,
      postcode: booking.postcode,
      state: booking.state,
      country: booking.country,
      status: booking.status,
      linkedin: booking.linkedin,
      orcid: booking.orcid,
      researchGate: booking.researchGate,
      membershipType: booking.membershipType,
      membershipFee: booking.membershipFee,
      interests: booking.interests,
      experience: booking.experience,
      profilePhoto: booking.profilePhoto,
      membershipId: generatedMembershipId,
      issueDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      paymentStatus: 'completed',
      active: true,
      isAdminApproved: true,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      adminRemarks: adminRemarks || '',
      userId: booking.userId
    };
    
    // Create the membership
    const membership = new Membership(membershipData);
    const savedMembership = await membership.save();
    
    // Update booking status
    booking.bookingStatus = 'approved';
    booking.approvedBy = req.user._id;
    booking.approvedAt = new Date();
    booking.adminRemarks = adminRemarks || '';
    await booking.save();
    
    // Send approval email
    try {
      await sendMembershipApprovalEmail(
        booking.email,
        `${booking.firstName} ${booking.lastName}`,
        savedMembership.membershipId,
        booking.membershipType,
        savedMembership.issueDate,
        savedMembership.expiryDate
      );
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
    }
    
    res.status(200).json({
      success: true,
      message: 'Booking approved and membership created successfully',
      membership: savedMembership,
      membershipId: savedMembership.membershipId
    });
    
  } catch (error) {
    console.error('Error approving booking:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve booking'
    });
  }
};

// Reject booking (Admin only)
export const rejectBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { rejectedReason } = req.body;
    
    if (!rejectedReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    const booking = await BookingMembership.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    if (booking.bookingStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an approved booking'
      });
    }
    
    booking.bookingStatus = 'rejected';
    booking.rejectedReason = rejectedReason;
    booking.approvedBy = req.user._id;
    booking.approvedAt = new Date();
    
    await booking.save();
    
    res.status(200).json({
      success: true,
      message: 'Booking rejected successfully',
      booking
    });
    
  } catch (error) {
    console.error('Error rejecting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject booking'
    });
  }
};

// Get booking statistics (Admin only)
export const getBookingStats = async (req, res) => {
  try {
    const totalBookings = await BookingMembership.countDocuments();
    const pendingBookings = await BookingMembership.countDocuments({ bookingStatus: 'pending' });
    const approvedBookings = await BookingMembership.countDocuments({ bookingStatus: 'approved' });
    const rejectedBookings = await BookingMembership.countDocuments({ bookingStatus: 'rejected' });
    const paidBookings = await BookingMembership.countDocuments({ paymentStatus: 'paid' });
    
    res.status(200).json({
      success: true,
      stats: {
        total: totalBookings,
        pending: pendingBookings,
        approved: approvedBookings,
        rejected: rejectedBookings,
        paid: paidBookings
      }
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking statistics'
    });
  }
};
