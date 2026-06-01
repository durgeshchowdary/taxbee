import mongoose from "mongoose";

const ReviewAssignmentSchema = new mongoose.Schema(
  {
    workspaceOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reviewerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    importedDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImportedDocument",
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["assigned", "in_review", "changes_requested", "approved", "completed"],
      default: "assigned",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
      index: true,
    },
    dueAt: {
      type: Date,
      default: null,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    signOffAt: {
      type: Date,
      default: null,
    },
    signOffBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

ReviewAssignmentSchema.index({
  workspaceOwnerId: 1,
  reviewerUserId: 1,
  status: 1,
  dueAt: 1,
});

ReviewAssignmentSchema.index({
  reviewerUserId: 1,
  status: 1,
  priority: 1,
  dueAt: 1,
});

const ReviewAssignment =
  mongoose.models.ReviewAssignment ||
  mongoose.model("ReviewAssignment", ReviewAssignmentSchema);

export default ReviewAssignment;