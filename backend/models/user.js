import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: ["taxpayer", "reviewer", "ca", "admin", "internal"],
    default: "taxpayer",
  },
  isVerified: { type: Boolean, default: false },
  otpHash: { type: String, select: false },
  otpExpiresAt: { type: Date, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
}, { timestamps: true });

userSchema.virtual("isEmailVerified")
  .get(function getIsEmailVerified() {
    return Boolean(this.isVerified);
  })
  .set(function setIsEmailVerified(value) {
    this.isVerified = Boolean(value);
  });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ isVerified: 1, createdAt: -1 });
userSchema.index({ otpExpiresAt: 1 }, { sparse: true });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ passwordResetExpiresAt: 1 }, { sparse: true });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

export default mongoose.model("User", userSchema);
