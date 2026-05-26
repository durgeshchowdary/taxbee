import mongoose from "mongoose";

const ReviewActionSchema = new mongoose.Schema(
  {
    workspaceOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reviewerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    importedDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: "ImportedDocument", required: true, index: true },
    fieldKey: { type: String, required: true, trim: true, maxlength: 200, index: true },
    fieldLabel: { type: String, default: "", trim: true, maxlength: 200 },
    action: {
      type: String,
      enum: ["approved", "rejected", "flagged", "correction_requested"],
      required: true,
      index: true,
    },
    reason: { type: String, default: "", trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

ReviewActionSchema.index({ workspaceOwnerId: 1, action: 1, createdAt: -1 });
ReviewActionSchema.index({ workspaceOwnerId: 1, fieldKey: 1, createdAt: -1 });

const ReviewAction = mongoose.model("ReviewAction", ReviewActionSchema);

export default ReviewAction;
