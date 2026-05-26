import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    type: {
      type: String,
      enum: [
        "email_verification",
        "reviewer_invite",
        "reviewer_comment",
        "import_job_completed",
        "import_job_failed",
        "filing_readiness_reminder",
        "security_alert",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, maxlength: 160 },
    message: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ["unread", "read"], default: "unread", index: true },
    emailStatus: {
      type: String,
      enum: ["not_queued", "queued", "sent", "failed", "skipped"],
      default: "not_queued",
      index: true,
    },
    emailQueuedAt: { type: Date, default: null },
    emailSentAt: { type: Date, default: null },
    emailFailureReason: { type: String, default: "", maxlength: 500 },
    readAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    dedupeKey: { type: String, default: "", index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ recipientEmail: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, dedupeKey: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
