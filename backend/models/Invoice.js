import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    planCode: {
      type: String,
      required: true,
    },

    amountInPaise: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["issued", "paid", "cancelled"],
      default: "paid",
      index: true,
    },

    issuedAt: {
      type: Date,
      default: Date.now,
    },

    pdfUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Invoice =
  mongoose.models.Invoice ||
  mongoose.model("Invoice", InvoiceSchema);

export default Invoice;