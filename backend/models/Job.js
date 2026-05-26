import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "document_extraction",
        "tax_intelligence_recalculation",
        "audit_event_enrichment",
        "email_invite",
        "email_send",
        "cleanup_stale_jobs",
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    priority: { type: Number, default: 0, index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    failureReason: { type: String, default: "" },
    lockedAt: { type: Date, default: null, index: true },
    lockedBy: { type: String, default: "" },
    runAfter: { type: Date, default: Date.now, index: true },
    completedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    timeoutAt: { type: Date, default: null },
    inputRef: { type: mongoose.Schema.Types.Mixed, default: {} },
    resultRef: { type: mongoose.Schema.Types.Mixed, default: {} },
    securePayload: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
  },
  { timestamps: true }
);

JobSchema.index({ status: 1, runAfter: 1, priority: -1, createdAt: 1 });
JobSchema.index({ userId: 1, createdAt: -1 });
JobSchema.index({ userId: 1, status: 1, createdAt: -1 });
JobSchema.index({ type: 1, status: 1, runAfter: 1 });
JobSchema.index({ lockedAt: 1, status: 1 });

const Job = mongoose.model("Job", JobSchema);

export default Job;
