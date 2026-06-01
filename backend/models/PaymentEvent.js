import mongoose from "mongoose";

const PaymentEventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["razorpay"],
      default: "razorpay",
      index: true,
    },

    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    eventType: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    razorpayOrderId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    razorpayPaymentId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["received", "processed", "ignored", "failed"],
      default: "received",
      index: true,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

PaymentEventSchema.index({ eventType: 1, createdAt: -1 });
PaymentEventSchema.index({ status: 1, createdAt: -1 });

const PaymentEvent =
  mongoose.models.PaymentEvent ||
  mongoose.model("PaymentEvent", PaymentEventSchema);

export default PaymentEvent;