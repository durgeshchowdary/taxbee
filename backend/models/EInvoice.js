import mongoose from "mongoose";

const EInvoiceLineItemSchema = new mongoose.Schema(
  {
    description: { type: String, trim: true, default: "" },
    hsnCode: { type: String, trim: true, default: "" },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    taxableValue: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    cessAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const EInvoiceVersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    changes: { type: mongoose.Schema.Types.Mixed, default: {} },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, _id: false }
);

const ValidationErrorSchema = new mongoose.Schema(
  {
    field: { type: String, trim: true, default: "" },
    path: { type: String, trim: true, default: "" },
    code: { type: String, trim: true, default: "" },
    message: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const EInvoiceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
      index: true,
    },
    sellerGstin: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    buyerGstin: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    buyerName: {
      type: String,
      required: true,
      trim: true,
    },
    stateCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    invoiceType: {
      type: String,
      enum: ["regular", "deemed_export", "bill_of_supply", "export", "other"],
      default: "regular",
      index: true,
    },
    lineItems: {
      type: [EInvoiceLineItemSchema],
      default: [],
    },
    subtotalAmount: {
      type: Number,
      default: 0,
    },
    totalTaxAmount: {
      type: Number,
      default: 0,
    },
    invoiceValue: {
      type: Number,
      default: 0,
    },
    irn: {
      type: String,
      default: "",
      index: true,
    },
    irnRequestedAt: Date,
    irnGeneratedAt: Date,
    qrCode: {
      type: String,
      default: "",
    },
    qrGeneratedAt: Date,
    status: {
      type: String,
      enum: [
        "draft",
        "validated",
        "irn_requested",
        "irn_generated",
        "qr_generated",
        "submitted",
        "cancelled",
        "rejected",
        "retry_pending",
        "failed",
      ],
      default: "draft",
      index: true,
    },
    validationErrors: {
      type: [ValidationErrorSchema],
      default: [],
    },
    version: {
      type: Number,
      default: 1,
    },
    versions: {
      type: [EInvoiceVersionSchema],
      default: [],
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: "",
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      trim: true,
      default: "",
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetryAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

EInvoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });
EInvoiceSchema.index({ status: 1, irn: 1, invoiceDate: -1 });

const EInvoice = mongoose.models.EInvoice || mongoose.model("EInvoice", EInvoiceSchema);

export default EInvoice;
