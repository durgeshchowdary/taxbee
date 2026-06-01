import mongoose from "mongoose";

const usageSchema = new mongoose.Schema(
  {
    documentsImported: { type: Number, default: 0, min: 0 },
    ocrPagesProcessed: { type: Number, default: 0, min: 0 },
    aiRequests: { type: Number, default: 0, min: 0 },
    reviewerSeats: { type: Number, default: 0, min: 0 },
    storageUsedMb: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const reminderSchema = new mongoose.Schema(
  {
    day11SentAt: { type: Date, default: null },
    day12SentAt: { type: Date, default: null },
    day13SentAt: { type: Date, default: null },
    day14SentAt: { type: Date, default: null },
    expirySentAt: { type: Date, default: null },
    deactivationSentAt: { type: Date, default: null },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "trialing",
        "payment_required",
        "deactivated",
        "active",
        "past_due",
        "cancelled",
        "expired",
      ],
      default: "trialing",
      index: true,
    },

    trialStartedAt: {
      type: Date,
      default: Date.now,
    },

    trialEndsAt: {
      type: Date,
      required: true,
      index: true,
    },

    paymentRequiredAt: {
      type: Date,
      default: null,
    },

    deactivatedAt: {
      type: Date,
      default: null,
    },

    activatedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    autoRenew: {
      type: Boolean,
      default: false,
    },

    isTrial: {
      type: Boolean,
      default: true,
    },

    reminders: {
      type: reminderSchema,
      default: () => ({}),
    },

    usage: {
      type: usageSchema,
      default: () => ({}),
    },

    provider: {
      type: String,
      enum: ["none", "razorpay", "stripe"],
      default: "none",
    },

    providerCustomerId: {
      type: String,
      default: "",
      trim: true,
    },

    providerSubscriptionId: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ status: 1, trialEndsAt: 1 });
subscriptionSchema.index({ status: 1, deactivatedAt: 1 });

const Subscription =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);

export default Subscription;