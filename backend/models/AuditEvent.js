import mongoose from "mongoose";

const AuditEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventType: {
      type: String,
      enum: [
        "document_upload",
        "field_extraction",
        "field_confirmation",
        "field_override",
        "deduction_update",
        "itr_draft_update",
        "assistant_field_update",
        "tax_intelligence_snapshot",
        "document_delete",
        "collaboration_invite_sent",
        "collaboration_invite_accepted",
        "collaboration_access_revoked",
        "reviewer_comment_added",
        "reviewer_comment_resolved",
        "reviewer_field_approved",
        "reviewer_field_flagged",
        "job_queued",
        "job_completed",
        "job_failed",
        "auth_signup",
        "auth_signup_failed",
        "auth_login_success",
        "auth_login_failed",
        "auth_logout",
        "auth_session_restored",
        "auth_email_verified",
        "auth_verification_failed",
        "auth_verification_resent",
        "WEBHOOK_CREATED",
        "WEBHOOK_UPDATED",
        "WEBHOOK_DISABLED",
        "WEBHOOK_TEST_SENT",
        "WEBHOOK_DELIVERY_SUCCESS",
        "WEBHOOK_DELIVERY_FAILED",
      ],
      required: true,
      index: true,
    },
    entityType: { type: String, default: "" },
    entityId: { type: String, default: "", index: true },
    fieldKey: { type: String, default: "", index: true },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    sourceType: {
      type: String,
      enum: ["document", "manual", "import", "system", "assistant"],
      default: "system",
    },
    sourceDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: "ImportedDocument", default: null },
    confidence: { type: Number, default: null },
    actorType: {
      type: String,
      enum: ["user", "system", "assistant"],
      default: "system",
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: "timestamp", updatedAt: false } }
);

AuditEventSchema.index({ userId: 1, timestamp: -1 });
AuditEventSchema.index({ userId: 1, fieldKey: 1, timestamp: -1 });
AuditEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
AuditEventSchema.index({ sourceDocumentId: 1, timestamp: -1 }, { sparse: true });

const AuditEvent = mongoose.model("AuditEvent", AuditEventSchema);

export default AuditEvent;
