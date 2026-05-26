import mongoose from "mongoose";

const PermissionSchema = new mongoose.Schema(
  {
    viewDocuments: { type: Boolean, default: true },
    reviewFields: { type: Boolean, default: true },
    comment: { type: Boolean, default: true },
    approve: { type: Boolean, default: false },
    editDraft: { type: Boolean, default: false },
    viewAuditTimeline: { type: Boolean, default: true },
  },
  { _id: false }
);

const WorkspaceAccessSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reviewerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    reviewerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    role: { type: String, enum: ["reviewer", "ca", "viewer"], default: "reviewer" },
    status: { type: String, enum: ["invited", "accepted", "revoked"], default: "invited", index: true },
    permissions: { type: PermissionSchema, default: () => ({}) },
    invitedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

WorkspaceAccessSchema.index({ ownerUserId: 1, reviewerEmail: 1, status: 1 });
WorkspaceAccessSchema.index({ reviewerUserId: 1, status: 1, invitedAt: -1 });
WorkspaceAccessSchema.index({ reviewerEmail: 1, status: 1, invitedAt: -1 });
WorkspaceAccessSchema.index({ ownerUserId: 1, status: 1, invitedAt: -1 });

const WorkspaceAccess = mongoose.model("WorkspaceAccess", WorkspaceAccessSchema);

export default WorkspaceAccess;
