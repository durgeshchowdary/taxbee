import mongoose from "mongoose";

const CommentReplySchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    comment: { type: String, required: true, trim: true, maxlength: 3000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ReviewCommentSchema = new mongoose.Schema(
  {
    workspaceOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reviewerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    entityType: { type: String, default: "" },
    entityId: { type: String, default: "" },
    fieldKey: { type: String, default: "", index: true },
    comment: { type: String, required: true, trim: true, maxlength: 3000 },
    status: { type: String, enum: ["open", "resolved"], default: "open", index: true },
    resolvedAt: { type: Date, default: null },
    replies: { type: [CommentReplySchema], default: [] },
  },
  { timestamps: true }
);

ReviewCommentSchema.index({ workspaceOwnerId: 1, createdAt: -1 });
ReviewCommentSchema.index({ workspaceOwnerId: 1, status: 1, createdAt: -1 });
ReviewCommentSchema.index({ workspaceOwnerId: 1, fieldKey: 1, createdAt: -1 });
ReviewCommentSchema.index({ reviewerUserId: 1, createdAt: -1 });

const ReviewComment = mongoose.model("ReviewComment", ReviewCommentSchema);

export default ReviewComment;
