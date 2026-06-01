import mongoose from "mongoose";

const BackupRecordSchema = new mongoose.Schema(
  {
    backupId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["manual", "scheduled"],
      default: "manual",
      index: true,
    },

    status: {
      type: String,
      enum: ["created", "completed", "failed", "restored"],
      default: "created",
      index: true,
    },

    collections: {
      type: [String],
      default: [],
    },

    filePath: {
      type: String,
      default: "",
      trim: true,
    },

    sizeBytes: {
      type: Number,
      default: 0,
    },

    failureReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    restoredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

BackupRecordSchema.index({ status: 1, createdAt: -1 });
BackupRecordSchema.index({ type: 1, createdAt: -1 });

const BackupRecord =
  mongoose.models.BackupRecord ||
  mongoose.model("BackupRecord", BackupRecordSchema);

export default BackupRecord;