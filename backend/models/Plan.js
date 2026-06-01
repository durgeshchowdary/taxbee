import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    priceInPaise: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    billingCycle: {
      type: String,
      enum: ["trial", "monthly", "yearly", "custom"],
      required: true,
      index: true,
    },

    trialDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    features: {
      type: [String],
      default: [],
    },

    limits: {
      maxDocuments: { type: Number, default: 10 },
      maxReviewers: { type: Number, default: 0 },
      maxStorageGB: { type: Number, default: 1 },
      maxAiRequests: { type: Number, default: 50 },
      maxOcrPages: { type: Number, default: 100 },
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

const Plan = mongoose.models.Plan || mongoose.model("Plan", planSchema);

export default Plan;