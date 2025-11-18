import mongoose from "mongoose";

const bookingMembershipSchema = new mongoose.Schema({
  // Personal Information
  title: String,
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  mobile: String,
  
  // Professional Information
  currentPosition: String,
  institute: String,
  department: String,
  organisation: { type: String, required: true },
  
  // Address Information
  address: String,
  town: { type: String, required: true },
  postcode: String,
  state: String,
  country: { type: String, required: true },
  
  // Professional Status
  status: { type: String, required: true },
  
  // Social/Academic Links
  linkedin: String,
  orcid: String,
  researchGate: String,
  
  // Membership Details
  membershipType: { 
    type: String, 
    required: true,
    enum: ['student-ug', 'student-pg', 'academic', 'industry', 'international']
  },
  membershipFee: {
    type: Number,
    required: true
  },
  interests: [String],
  experience: String,
  profilePhoto: String,
  
  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['qr-code', 'bank-transfer'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    trim: true
  },
  paymentScreenshot: {
    type: String, // Cloudinary URL
  },
  paymentDate: {
    type: Date
  },
  
  // Admin Approval Status
  bookingStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminRemarks: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedReason: {
    type: String,
    default: ''
  },
  
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
bookingMembershipSchema.index({ email: 1 });
bookingMembershipSchema.index({ bookingStatus: 1 });
bookingMembershipSchema.index({ paymentStatus: 1 });
bookingMembershipSchema.index({ createdAt: -1 });

export default mongoose.models.BookingMembership || mongoose.model("BookingMembership", bookingMembershipSchema);
