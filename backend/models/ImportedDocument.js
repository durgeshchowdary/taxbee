import mongoose from "mongoose";

const ExtractedFieldSchema = new mongoose.Schema(
  {
    fieldId: { type: String, required: true },
    source: { type: String, default: "" },
    label: { type: String, required: true },
    path: { type: String, required: true },
    value: { type: String, default: "" },
    originalValue: { type: String, default: "" },
    mappedSection: { type: String, default: "" },
    confidence: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["extracted", "confirmed", "overridden"],
      default: "extracted",
    },
    userOverride: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AuditEntrySchema = new mongoose.Schema(
  {
    entryId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    label: { type: String, default: "" },
    key: { type: String, default: "" },
    path: { type: String, default: "" },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: "" },
    newValue: { type: String, default: "" },
    source: { type: String, default: "" },
    actor: { type: String, enum: ["parser", "user"], default: "parser" },
  },
  { _id: false }
);

const ImportedDocumentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    documentType: {
      type: String,
      enum: [
        "AIS",
        "FORM_26AS",
        "FORM_16",
        "SALARY_SLIP",
        "BANK_INTEREST_STATEMENT",
        "INSURANCE_RECEIPT",
        "DONATION_RECEIPT",
        "RENT_RECEIPT",
        "CAPITAL_GAINS_STATEMENT",
        "TAX_STATEMENT",
        "UNKNOWN",
      ],
      default: "UNKNOWN",
    },
    fileName: { type: String, required: true },
    mimeType: { type: String, default: "" },
    importedAt: { type: Date, default: Date.now },
    reviewStatus: {
      type: String,
      enum: ["queued", "processing", "extracted", "confirmed", "overridden", "failed"],
      default: "extracted",
    },
    detectedSections: { type: [String], default: [] },
    totals: {
      tds: { type: Number, default: 0 },
      interest: { type: Number, default: 0 },
      dividend: { type: Number, default: 0 },
      salary: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    extractedFields: { type: [ExtractedFieldSchema], default: [] },
    auditTrail: { type: [AuditEntrySchema], default: [] },
    extractedTextPreview: { type: String, default: "" },
    sourceMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    rawPreview: { type: mongoose.Schema.Types.Mixed, default: null },
lifecycleStatus: {
  type: String,
  enum: ["active", "soft_deleted", "retention_expired"],
  default: "active",
},

deletedAt: { type: Date, default: null },

deletedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},

restoredAt: { type: Date, default: null },

restoredBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},

retentionUntil: { type: Date, default: null },

permanentDeleteRequestedAt: { type: Date, default: null },  },
  { timestamps: true }
);

ImportedDocumentSchema.index({ userId: 1, importedAt: -1 });
ImportedDocumentSchema.index({ userId: 1, deletedAt: 1, importedAt: -1, createdAt: -1 });
ImportedDocumentSchema.index({ userId: 1, reviewStatus: 1, updatedAt: -1 });
ImportedDocumentSchema.index({ userId: 1, documentType: 1, importedAt: -1 });

const ImportedDocument = mongoose.model("ImportedDocument", ImportedDocumentSchema);

export default ImportedDocument;
