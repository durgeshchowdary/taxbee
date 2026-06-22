import mongoose from "mongoose";

const TaxFilingSchema = new mongoose.Schema(
  {
    userKey: {
      type: String,
      required: true,
      index: true,
    },

    itrDraftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ITRDraft",
      required: true,
    },

    filingStatus: {
      type: String,
      enum: [
        "draft",
        "ready_for_review",
        "ready_to_file",
        "submitted",
        "processing",
        "accepted",
        "rejected",
        "completed",
      ],
      default: "draft",
    },

    acknowledgementNumber: {
      type: String,
      default: "",
    },

    submittedAt: Date,

    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("TaxFiling", TaxFilingSchema);