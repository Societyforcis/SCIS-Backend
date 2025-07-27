import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema({
  title: String,
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  mobile: String,
  currentPosition: String,
  institute: String,
  department: String,
  organisation: { type: String, required: true },
  address: String,
  town: { type: String, required: true },
  postcode: String,
  state: String,
  country: { type: String, required: true },
  status: { type: String, required: true },
  linkedin: String,
  orcid: String,
  researchGate: String,
  membershipType: { 
    type: String, 
    required: true,
    enum: ['student', 'professional', 'corporate']
  },
  interests: [String],
  experience: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  membershipFee: String,
  profilePhoto: { type: String },
  membershipId: { type: String },
  issueDate: { type: Date },
  expiryDate: { type: Date },
  active: {
    type: Boolean,
    default: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Add a pre-save hook to handle profilePhoto
membershipSchema.pre('save', function(next) {
  if (this.profilePhoto && !this.profilePhoto.startsWith('http')) {
    // Store profile photo properly (you might want to implement file upload)
    // this.profilePhoto = uploaded URL
  }
  next();
});

export default mongoose.models.Membership || mongoose.model("Membership", membershipSchema);