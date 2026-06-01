import mongoose from "mongoose";

const consentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    consentType: {
      type: String,
      enum: ["ai_processing", "document_processing", "privacy_policy", "terms"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["accepted", "revoked"],
      default: "accepted",
      index: true,
    },
    version: {
      type: String,
      default: "v1",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

consentSchema.index({ userId: 1, consentType: 1 }, { unique: true });

export default mongoose.model("Consent", consentSchema);