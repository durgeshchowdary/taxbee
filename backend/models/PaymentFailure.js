import mongoose from "mongoose";

const PaymentFailureSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
    },

    retryCount: {
      type: Number,
      default: 0,
    },

    recovered: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "PaymentFailure",
  PaymentFailureSchema
);