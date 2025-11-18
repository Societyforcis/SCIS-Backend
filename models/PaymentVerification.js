import mongoose from "mongoose";

const paymentVerificationSchema = new mongoose.Schema({
  membershipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membership',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  email: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  membershipType: {
    type: String,
    required: true,
    enum: ['student-ug', 'student-pg', 'academic', 'industry', 'international']
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['qr-code', 'bank-transfer', 'upi'],
    default: 'bank-transfer'
  },
  transactionId: {
    type: String,
    trim: true
  },
  paymentScreenshot: {
    type: String, // Cloudinary URL
  },
  remarks: {
    type: String,
    trim: true
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  adminRemarks: {
    type: String,
    trim: true
  },
  isUpgrade: {
    type: Boolean,
    default: false
  },
  previousMembershipType: {
    type: String
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
paymentVerificationSchema.index({ verificationStatus: 1 });
paymentVerificationSchema.index({ email: 1 });
paymentVerificationSchema.index({ membershipId: 1 });

export default mongoose.models.PaymentVerification || mongoose.model("PaymentVerification", paymentVerificationSchema);
