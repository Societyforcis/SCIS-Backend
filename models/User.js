import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: false
    },
    lastName: {
      type: String,
      required: false
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: function() {
        // Only require password if not using Google authentication
        return !this.googleId;
      }
    },
    googleId: {
      type: String,
      required: false
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    profilePicture: String,
    // For account verification
    verificationOTP: String,
    verificationOTPExpires: Date,
    // For password reset
    resetOTP: String,
    resetOTPExpires: Date
  },
  { timestamps: true }
);

// Virtual for user settings
userSchema.virtual("settings", {
  ref: "UserSettings",
  localField: "_id",
  foreignField: "userId",
  justOne: true
});

// Hash password before saving
userSchema.pre("save", async function(next) {
  try {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified("password")) {
      return next();
    }
    
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password using the new salt
    const hashedPassword = await bcrypt.hash(this.password, salt);
    // Override the plain text password with the hashed one
    this.password = hashedPassword;
    next();
  } catch (error) {
    console.error("Error in password hashing:", error);
    next(error);
  }
});

// Method to check if password matches
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;