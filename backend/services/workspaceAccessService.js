import mongoose from "mongoose";
import User from "../models/user.js";
import WorkspaceAccess from "../models/WorkspaceAccess.js";
import { logger } from "../utils/safeLogger.js";

export const defaultPermissions = {
  viewDocuments: true,
  reviewFields: true,
  comment: true,
  approve: false,
  editDraft: false,
  viewAuditTimeline: true,
};

export const normalizePermissions = (permissions = {}) => ({
  ...defaultPermissions,
  ...Object.fromEntries(
    Object.entries(permissions || {}).map(([key, value]) => [key, Boolean(value)])
  ),
});

export const serializeWorkspaceAccess = (access) => ({
  id: String(access._id),
  ownerUserId: String(access.ownerUserId?._id || access.ownerUserId),
  ownerName: access.ownerUserId?.name || "",
  ownerEmail: access.ownerUserId?.email || "",
  reviewerEmail: access.reviewerEmail,
  reviewerUserId: access.reviewerUserId ? String(access.reviewerUserId?._id || access.reviewerUserId) : null,
  role: access.role,
  status: access.status,
  permissions: access.permissions || defaultPermissions,
  invitedAt: access.invitedAt?.toISOString?.() || access.invitedAt,
  acceptedAt: access.acceptedAt?.toISOString?.() || access.acceptedAt,
  revokedAt: access.revokedAt?.toISOString?.() || access.revokedAt,
});

export const canAccessWorkspace = async ({ actorUserId, ownerUserId, permission }) => {
  if (!actorUserId || !ownerUserId || !mongoose.Types.ObjectId.isValid(ownerUserId)) {
    logger.warn("collaboration_access_check", {
      actorUserId,
      ownerUserId,
      permission,
      allowed: false,
      reason: "invalid_scope",
    });
    return { allowed: false, ownerUserId: null, access: null, isOwner: false };
  }

  if (String(actorUserId) === String(ownerUserId)) {
    logger.info("collaboration_access_check", {
      actorUserId,
      ownerUserId,
      permission,
      allowed: true,
      isOwner: true,
    });
    return { allowed: true, ownerUserId: String(ownerUserId), access: null, isOwner: true };
  }

  const actor = await User.findById(actorUserId).lean();
  if (!actor) {
    logger.warn("collaboration_access_check", {
      actorUserId,
      ownerUserId,
      permission,
      allowed: false,
      reason: "actor_not_found",
    });
    return { allowed: false, ownerUserId: null, access: null, isOwner: false };
  }

  const access = await WorkspaceAccess.findOne({
    ownerUserId,
    status: "accepted",
    $or: [{ reviewerUserId: actorUserId }, { reviewerEmail: actor.email }],
  }).lean();

  const allowed = Boolean(access && (!permission || access.permissions?.[permission]));
  logger.info("collaboration_access_check", {
    actorUserId,
    ownerUserId,
    permission,
    allowed,
    isOwner: false,
    accessId: access?._id ? String(access._id) : null,
  });
  return {
    allowed,
    ownerUserId: allowed ? String(ownerUserId) : null,
    access,
    isOwner: false,
  };
};

export const resolveWorkspaceOwner = async (req, permission) => {
  const requestedOwnerId = req.query?.ownerId || req.body?.workspaceOwnerId;
  const ownerUserId = requestedOwnerId || req.user?.id;
  return canAccessWorkspace({ actorUserId: req.user?.id, ownerUserId, permission });
};
