import PaymentVerification from '../models/PaymentVerification.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

// Membership fee structure
export const MEMBERSHIP_FEES = {
  'student-ug': 250,      // Undergraduate students - ₹250/year
  'student-pg': 350,      // Postgraduate students - ₹350/year
  'academic': 500,        // Academic/Faculty - ₹500/year
  'industry': 750,        // Industry professionals - ₹750/year
  'international': 600    // International members - ₹600/year
};

// Get membership fee based on type
export const getMembershipFee = (req, res) => {
  try {
    const { type } = req.params;
    
    if (!type || !MEMBERSHIP_FEES[type]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid membership type'
      });
    }

    res.json({
      success: true,
      membershipType: type,
      fee: MEMBERSHIP_FEES[type],
      currency: 'INR'
    });
  } catch (error) {
    console.error('Error getting membership fee:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching membership fee'
    });
  }
};

// Get all membership fees
export const getAllMembershipFees = (req, res) => {
  try {
    res.json({
      success: true,
      fees: MEMBERSHIP_FEES,
      currency: 'INR',
      paymentDetails: {
        accountName: 'Society for cyber intelligent systems',
        accountNumber: '8067349218',
        ifscCode: 'IDIB000R076',
        bankName: 'Indian Bank',
        branch: 'Reddiyarpalayam, Puducherry',
        upiId: 'societyforcyber@indianbk'
      }
    });
  } catch (error) {
    console.error('Error getting membership fees:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching membership fees'
    });
  }
};

// Submit payment verification
export const submitPaymentVerification = async (req, res) => {
  try {
    const {
      membershipId,
      transactionId,
      remarks,
      paymentMethod = 'bank-transfer'
    } = req.body;

    if (!membershipId) {
      return res.status(400).json({
        success: false,
        message: 'Membership ID is required'
      });
    }

    // Find the membership
    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership not found'
      });
    }

    // Check if payment verification already exists
    const existingVerification = await PaymentVerification.findOne({
      membershipId,
      verificationStatus: { $in: ['pending', 'approved'] }
    });

    if (existingVerification) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification already submitted for this membership'
      });
    }

    // Handle payment screenshot upload
    let screenshotUrl = null;
    if (req.body.paymentScreenshot) {
      try {
        const uploadResult = await uploadToCloudinary(req.body.paymentScreenshot);
        screenshotUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Error uploading screenshot:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Error uploading payment screenshot'
        });
      }
    }

    // Create payment verification record
    const paymentVerification = new PaymentVerification({
      membershipId,
      userId: membership.userId,
      email: membership.email,
      firstName: membership.firstName,
      lastName: membership.lastName,
      membershipType: membership.membershipType,
      amount: membership.membershipFee,
      paymentMethod,
      transactionId: transactionId || '',
      paymentScreenshot: screenshotUrl,
      remarks: remarks || '',
      verificationStatus: 'pending'
    });

    await paymentVerification.save();

    // Update membership with payment verification reference
    membership.paymentVerificationId = paymentVerification._id;
    membership.paymentStatus = 'verified'; // Waiting for admin approval
    await membership.save();

    res.status(201).json({
      success: true,
      message: 'Payment verification submitted successfully. Awaiting admin approval.',
      data: {
        verificationId: paymentVerification._id,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error submitting payment verification:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting payment verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Submit payment verification for membership upgrade
export const submitUpgradePaymentVerification = async (req, res) => {
  try {
    const {
      membershipId,
      newMembershipType,
      transactionId,
      remarks,
      paymentMethod = 'bank-transfer'
    } = req.body;

    if (!membershipId || !newMembershipType) {
      return res.status(400).json({
        success: false,
        message: 'Membership ID and new membership type are required'
      });
    }

    // Find the membership
    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership not found'
      });
    }

    // Check if upgrade is needed
    if (membership.membershipType === newMembershipType) {
      return res.status(400).json({
        success: false,
        message: 'New membership type is same as current type'
      });
    }

    // Calculate fee for new membership type
    const newFee = MEMBERSHIP_FEES[newMembershipType];
    if (!newFee) {
      return res.status(400).json({
        success: false,
        message: 'Invalid membership type'
      });
    }

    // Handle payment screenshot upload
    let screenshotUrl = null;
    if (req.body.paymentScreenshot) {
      try {
        const uploadResult = await uploadToCloudinary(req.body.paymentScreenshot);
        screenshotUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Error uploading screenshot:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Error uploading payment screenshot'
        });
      }
    }

    // Create payment verification record for upgrade
    const paymentVerification = new PaymentVerification({
      membershipId,
      userId: membership.userId,
      email: membership.email,
      firstName: membership.firstName,
      lastName: membership.lastName,
      membershipType: newMembershipType,
      amount: newFee,
      paymentMethod,
      transactionId: transactionId || '',
      paymentScreenshot: screenshotUrl,
      remarks: remarks || '',
      verificationStatus: 'pending',
      isUpgrade: true,
      previousMembershipType: membership.membershipType
    });

    await paymentVerification.save();

    res.status(201).json({
      success: true,
      message: 'Upgrade payment verification submitted successfully. Awaiting admin approval.',
      data: {
        verificationId: paymentVerification._id,
        status: 'pending',
        previousType: membership.membershipType,
        newType: newMembershipType,
        amount: newFee
      }
    });
  } catch (error) {
    console.error('Error submitting upgrade payment verification:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting upgrade payment verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all payment verifications (Admin only)
export const getAllPaymentVerifications = async (req, res) => {
  try {
    const { status, isUpgrade } = req.query;
    
    let query = {};
    if (status) {
      query.verificationStatus = status;
    }
    if (isUpgrade !== undefined) {
      query.isUpgrade = isUpgrade === 'true';
    }

    const verifications = await PaymentVerification.find(query)
      .populate('membershipId', 'firstName lastName email membershipId membershipType')
      .populate('userId', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email')
      .sort('-createdAt');

    res.json({
      success: true,
      verifications,
      total: verifications.length
    });
  } catch (error) {
    console.error('Error fetching payment verifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment verifications'
    });
  }
};

// Get payment verification by ID
export const getPaymentVerificationById = async (req, res) => {
  try {
    const verification = await PaymentVerification.findById(req.params.id)
      .populate('membershipId')
      .populate('userId', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email');

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Payment verification not found'
      });
    }

    res.json({
      success: true,
      verification
    });
  } catch (error) {
    console.error('Error fetching payment verification:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment verification'
    });
  }
};

// Approve payment verification (Admin only)
export const approvePaymentVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminRemarks } = req.body;

    const verification = await PaymentVerification.findById(id);
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Payment verification not found'
      });
    }

    if (verification.verificationStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Payment verification is already ${verification.verificationStatus}`
      });
    }

    // Update verification status
    verification.verificationStatus = 'approved';
    verification.verifiedBy = req.user._id;
    verification.verifiedAt = new Date();
    verification.adminRemarks = adminRemarks || '';
    await verification.save();

    // Update membership
    const membership = await Membership.findById(verification.membershipId);
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership not found'
      });
    }

    // If it's an upgrade, update membership type
    if (verification.isUpgrade) {
      membership.membershipType = verification.membershipType;
      membership.membershipFee = verification.amount;
    }

    membership.paymentStatus = 'completed';
    
    // Set issue date and expiry date if not already set
    if (!membership.issueDate) {
      membership.issueDate = new Date();
      
      // Set expiry date (1 year from now)
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      membership.expiryDate = expiryDate;
    }
    
    // IMPORTANT: Set admin approval flags
    membership.active = true;
    membership.isAdminApproved = true;
    membership.approvedBy = req.user._id;
    membership.approvedAt = new Date();
    membership.adminRemarks = adminRemarks || '';
    
    await membership.save();

    // Send email notification to user
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: membership.email,
        subject: '🎉 Your SCIS Membership Has Been Approved!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">Congratulations! Your Membership is Approved</h2>
            
            <p>Dear ${membership.firstName} ${membership.lastName},</p>
            
            <p>We are pleased to inform you that your membership application has been approved by our admin team.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Membership Details:</h3>
              <p><strong>Membership ID:</strong> ${membership.membershipId}</p>
              <p><strong>Membership Type:</strong> ${membership.membershipType}</p>
              <p><strong>Issue Date:</strong> ${membership.issueDate.toLocaleDateString()}</p>
              <p><strong>Expiry Date:</strong> ${membership.expiryDate.toLocaleDateString()}</p>
              <p><strong>Status:</strong> Active ✅</p>
            </div>
            
            ${adminRemarks ? `<p><strong>Admin Message:</strong> ${adminRemarks}</p>` : ''}
            
            <p>You can now access your membership card and enjoy all member benefits!</p>
            
            <div style="margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://societycis.org'}/membership" 
                 style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View My Membership Card
              </a>
            </div>
            
            <p>Thank you for joining the Society for Cyber Intelligent Systems!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="font-size: 12px; color: #666;">
              Society for Cyber Intelligent Systems<br>
              Email: societyforcis.org@gmail.com
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Approval email sent to ${membership.email}`);
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
      // Don't fail the approval if email fails
    }

    res.json({
      success: true,
      message: verification.isUpgrade 
        ? 'Membership upgrade approved successfully. Notification email sent.' 
        : 'Payment verified and membership activated successfully. Notification email sent.',
      verification,
      membership
    });
  } catch (error) {
    console.error('Error approving payment verification:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving payment verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Reject payment verification (Admin only)
export const rejectPaymentVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminRemarks } = req.body;

    if (!adminRemarks) {
      return res.status(400).json({
        success: false,
        message: 'Admin remarks are required for rejection'
      });
    }

    const verification = await PaymentVerification.findById(id);
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Payment verification not found'
      });
    }

    if (verification.verificationStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Payment verification is already ${verification.verificationStatus}`
      });
    }

    // Update verification status
    verification.verificationStatus = 'rejected';
    verification.verifiedBy = req.user._id;
    verification.verifiedAt = new Date();
    verification.adminRemarks = adminRemarks;
    await verification.save();

    // Update membership status
    const membership = await Membership.findById(verification.membershipId);
    if (membership) {
      membership.paymentStatus = 'rejected';
      membership.paymentVerificationId = null;
      await membership.save();
    }

    res.json({
      success: true,
      message: 'Payment verification rejected',
      verification
    });
  } catch (error) {
    console.error('Error rejecting payment verification:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting payment verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get payment verification status by membership ID
export const getVerificationStatusByMembershipId = async (req, res) => {
  try {
    const { membershipId } = req.params;

    const verification = await PaymentVerification.findOne({ 
      membershipId 
    }).sort('-createdAt');

    if (!verification) {
      return res.json({
        success: true,
        hasVerification: false,
        message: 'No payment verification found'
      });
    }

    res.json({
      success: true,
      hasVerification: true,
      verification: {
        id: verification._id,
        status: verification.verificationStatus,
        amount: verification.amount,
        paymentMethod: verification.paymentMethod,
        submittedAt: verification.createdAt,
        verifiedAt: verification.verifiedAt,
        adminRemarks: verification.adminRemarks,
        isUpgrade: verification.isUpgrade
      }
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching verification status'
    });
  }
};
