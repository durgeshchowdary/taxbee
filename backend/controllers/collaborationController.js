import User from "../models/user.js";
import WorkspaceAccess from "../models/WorkspaceAccess.js";
import ReviewComment from "../models/ReviewComment.js";
import ReviewAction from "../models/ReviewAction.js";
import ImportedDocument from "../models/ImportedDocument.js";
import { fail } from "../utils/apiResponse.js";
import { getUserTaxContext } from "../utils/taxContextService.js";
import { buildTaxIntelligenceReport } from "../services/taxIntelligenceService.js";
import {
  canAccessWorkspace,
  normalizePermissions,
  serializeWorkspaceAccess,
} from "../services/workspaceAccessService.js";
import { recordAuditEvent } from "../services/auditTrailService.js";
import { requireObjectId } from "../utils/mongoSafety.js";
import { sanitizeText } from "../middleware/validationMiddleware.js";
import { logger } from "../utils/safeLogger.js";
import { pageResult, parsePagination } from "../utils/pagination.js";
import { createNotification } from "../services/notificationService.js";
import { invalidateUserTaxContextCache } from "../utils/taxContextService.js";

const serializeComment = (comment) => ({
  id: String(comment._id),
  workspaceOwnerId: String(comment.workspaceOwnerId),
  reviewerUserId: String(comment.reviewerUserId),
  entityType: comment.entityType,
  entityId: comment.entityId,
  fieldKey: comment.fieldKey,
  comment: comment.comment,
  status: comment.status,
  createdAt: comment.createdAt?.toISOString?.() || comment.createdAt,
  resolvedAt: comment.resolvedAt?.toISOString?.() || comment.resolvedAt,
  replies: (comment.replies || []).map((reply) => ({
    id: String(reply._id),
    actorUserId: String(reply.actorUserId),
    comment: reply.comment,
    createdAt: reply.createdAt?.toISOString?.() || reply.createdAt,
  })),
});

const serializeReviewAction = (action) => ({
  id: String(action._id),
  workspaceOwnerId: String(action.workspaceOwnerId),
  reviewerUserId: String(action.reviewerUserId),
  importedDocumentId: String(action.importedDocumentId),
  fieldKey: action.fieldKey,
  fieldLabel: action.fieldLabel,
  action: action.action,
  reason: action.reason,
  createdAt: action.createdAt?.toISOString?.() || action.createdAt,
});

const workspaceSummaryFrom = ({ context, comments = [], actions = [] }) => {
  const imports = context?.imports || [];
  const extractedFields = imports.flatMap((doc) => doc.extractedFields || []);
  const missingDocuments = [];
  if (!imports.some((doc) => doc.documentType === "AIS")) missingDocuments.push("AIS");
  if (!imports.some((doc) => doc.documentType === "FORM_26AS")) missingDocuments.push("FORM_26AS");
  if (!imports.some((doc) => doc.documentType === "FORM_16")) missingDocuments.push("FORM_16");

  return {
    documentsPendingReview: imports.filter((doc) => ["queued", "processing", "extracted"].includes(doc.reviewStatus)).length,
    extractedFieldsPendingConfirmation: extractedFields.filter((field) => field.status === "extracted").length,
    unresolvedComments: comments.filter((comment) => comment.status === "open").length,
    missingDocuments,
    anomaliesRequiringReview: context?.taxIntelligence?.anomalies?.flags?.length || 0,
    reviewActions: {
      approved: actions.filter((action) => action.action === "approved").length,
      rejected: actions.filter((action) => action.action === "rejected").length,
      flagged: actions.filter((action) => action.action === "flagged").length,
      correctionRequested: actions.filter((action) => action.action === "correction_requested").length,
    },
  };
};

const notifyWorkspaceUser = async ({ userId, type, title, message, metadata, dedupeKey, priority = 1 }) => {
  const user = await User.findById(userId).select("email").lean();
  await createNotification({
    userId,
    recipientEmail: user?.email,
    type,
    title,
    message,
    metadata,
    dedupeKey,
    priority,
  });
};

export const inviteReviewer = async (req, res) => {
  try {
    const reviewerEmail = String(req.body?.reviewerEmail || "").trim().toLowerCase();
    if (!reviewerEmail || !reviewerEmail.includes("@")) {
      return fail(res, { status: 400, message: "Valid reviewerEmail is required" });
    }

    const reviewer = await User.findOne({ email: reviewerEmail }).lean();
    const owner = await User.findById(req.user.id).select("name email").lean();
    const access = await WorkspaceAccess.create({
      ownerUserId: req.user.id,
      reviewerEmail,
      reviewerUserId: reviewer?._id || null,
      role: ["reviewer", "ca", "viewer"].includes(req.body?.role) ? req.body.role : "reviewer",
      permissions: normalizePermissions(req.body?.permissions),
      status: "invited",
      invitedAt: new Date(),
    });

    await createNotification({
      userId: reviewer?._id || null,
      recipientEmail: reviewerEmail,
      type: "reviewer_invite",
      title: "TaxBee reviewer invite",
      message: `${owner?.name || "A TaxBee user"} invited you to review a TaxBee workspace. Sign in with this email to accept or review access.`,
      metadata: { accessId: String(access._id), ownerUserId: req.user.id, role: access.role },
      dedupeKey: `reviewer-invite:${access._id}`,
      priority: 1,
    });

    await recordAuditEvent({
      userId: req.user.id,
      eventType: "collaboration_invite_sent",
      entityType: "WorkspaceAccess",
      entityId: access._id,
      newValue: reviewerEmail,
      sourceType: "manual",
      actorType: "user",
      metadata: { role: access.role, permissions: access.permissions },
    });

    res.status(201).json({
      success: true,
      message: "Reviewer invite created",
      data: { access: serializeWorkspaceAccess(access) },
    });
  } catch (error) {
    logger.error("inviteReviewer error", error, { requestId: req.requestId });
    fail(res, { status: 500, message: "Server error while inviting reviewer" });
  }
};

export const getAccess = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("email name").lean();
    if (!user) return fail(res, { status: 404, message: "Authenticated user was not found" });

    const [owned, sharedWithMe] = await Promise.all([
      WorkspaceAccess.find({ ownerUserId: req.user.id }).sort({ invitedAt: -1 }).limit(100).lean(),
      WorkspaceAccess.find({
        status: { $ne: "revoked" },
        $or: [{ reviewerUserId: req.user.id }, { reviewerEmail: user.email }],
      })
        .populate("ownerUserId", "name email")
        .sort({ invitedAt: -1 })
        .limit(100)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      message: "Collaboration access fetched",
      data: {
        owned: owned.map(serializeWorkspaceAccess),
        sharedWithMe: sharedWithMe.map(serializeWorkspaceAccess),
      },
    });
  } catch (error) {
    logger.error("getAccess error", error, { requestId: req.requestId });
    fail(res, { status: 500, message: "Server error while fetching collaboration access" });
  }
};

export const acceptAccess = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("email name").lean();
    if (!user) return fail(res, { status: 404, message: "Authenticated user was not found" });

    requireObjectId(req.params.id);
    const access = await WorkspaceAccess.findOne({
      _id: req.params.id,
      status: "invited",
      $or: [{ reviewerUserId: req.user.id }, { reviewerEmail: user.email }],
    });

    if (!access) return fail(res, { status: 404, message: "Invite not found" });

    access.reviewerUserId = req.user.id;
    access.status = "accepted";
    access.acceptedAt = new Date();
    await access.save();

    await recordAuditEvent({
      userId: access.ownerUserId,
      eventType: "collaboration_invite_accepted",
      entityType: "WorkspaceAccess",
      entityId: access._id,
      newValue: user.email,
      sourceType: "manual",
      actorType: "user",
      metadata: { reviewerUserId: req.user.id },
    });

    res.status(200).json({
      success: true,
      message: "Invite accepted",
      data: { access: serializeWorkspaceAccess(access) },
    });
  } catch (error) {
    logger.error("acceptAccess error", error, { requestId: req.requestId });
    fail(res, { status: error.status || 500, message: error.status ? error.message : "Server error while accepting invite" });
  }
};

export const revokeAccess = async (req, res) => {
  try {
    requireObjectId(req.params.id);
    const access = await WorkspaceAccess.findOne({ _id: req.params.id, ownerUserId: req.user.id });
    if (!access) return fail(res, { status: 404, message: "Access record not found" });

    access.status = "revoked";
    access.revokedAt = new Date();
    await access.save();

    await recordAuditEvent({
      userId: req.user.id,
      eventType: "collaboration_access_revoked",
      entityType: "WorkspaceAccess",
      entityId: access._id,
      oldValue: access.reviewerEmail,
      sourceType: "manual",
      actorType: "user",
      metadata: { reviewerEmail: access.reviewerEmail },
    });

    res.status(200).json({
      success: true,
      message: "Reviewer access revoked",
      data: { access: serializeWorkspaceAccess(access) },
    });
  } catch (error) {
    logger.error("revokeAccess error", error, { requestId: req.requestId });
    fail(res, { status: error.status || 500, message: error.status ? error.message : "Server error while revoking access" });
  }
};

export const createComment = async (req, res) => {
  try {
    const workspaceOwnerId = req.body?.workspaceOwnerId || req.user.id;
    const access = await canAccessWorkspace({
      actorUserId: req.user.id,
      ownerUserId: workspaceOwnerId,
      permission: "comment",
    });
    if (!access.allowed) return fail(res, { status: 403, message: "You do not have permission to comment on this workspace" });

    const commentText = sanitizeText(req.body?.comment || "", 3000);
    if (!commentText) return fail(res, { status: 400, message: "comment is required" });

    const comment = await ReviewComment.create({
      workspaceOwnerId,
      reviewerUserId: req.user.id,
      entityType: sanitizeText(req.body?.entityType || "", 80),
      entityId: sanitizeText(req.body?.entityId || "", 120),
      fieldKey: sanitizeText(req.body?.fieldKey || "", 200),
      comment: commentText,
    });

    await recordAuditEvent({
      userId: workspaceOwnerId,
      eventType: "reviewer_comment_added",
      entityType: "ReviewComment",
      entityId: comment._id,
      fieldKey: comment.fieldKey,
      newValue: comment.comment,
      sourceType: "manual",
      actorType: "user",
      metadata: { reviewerUserId: req.user.id, targetEntityType: comment.entityType, targetEntityId: comment.entityId },
    });

    const [owner, reviewerUser] = await Promise.all([
      User.findById(workspaceOwnerId).select("email").lean(),
      User.findById(req.user.id).select("name").lean(),
    ]);
    await createNotification({
      userId: workspaceOwnerId,
      recipientEmail: owner?.email,
      type: "reviewer_comment",
      title: "New reviewer comment",
      message: `${reviewerUser?.name || "A reviewer"} added a comment in your TaxBee workspace. Open TaxBee to review the note.`,
      metadata: {
        commentId: String(comment._id),
        reviewerUserId: req.user.id,
        fieldKey: comment.fieldKey,
      },
      dedupeKey: `reviewer-comment:${comment._id}`,
      priority: 1,
    });

    res.status(201).json({
      success: true,
      message: "Review comment added",
      data: { comment: serializeComment(comment) },
    });
  } catch (error) {
    logger.error("createComment error", error, { requestId: req.requestId });
    fail(res, { status: 500, message: "Server error while adding comment" });
  }
};

export const listComments = async (req, res) => {
  try {
    const pagination = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
    const workspaceOwnerId = req.query.ownerId || req.user.id;
    const access = await canAccessWorkspace({
      actorUserId: req.user.id,
      ownerUserId: workspaceOwnerId,
      permission: "comment",
    });
    if (!access.allowed) return fail(res, { status: 403, message: "You do not have permission to view comments for this workspace" });

    const comments = await ReviewComment.find({ workspaceOwnerId })
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit + 1)
      .lean();
    const actions = await ReviewAction.find({ workspaceOwnerId }).sort({ createdAt: -1 }).limit(100).lean();
    const result = pageResult(comments, pagination);

    res.status(200).json({
      success: true,
      message: "Review comments fetched",
      data: {
        comments: result.items.map(serializeComment),
        reviewActions: actions.map(serializeReviewAction),
        pagination: result.pagination,
      },
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error("listComments error", error, { requestId: req.requestId });
    fail(res, { status: 500, message: "Server error while fetching comments" });
  }
};

export const replyToComment = async (req, res) => {
  try {
    requireObjectId(req.params.id);
    const comment = await ReviewComment.findById(req.params.id);
    if (!comment) return fail(res, { status: 404, message: "Comment not found" });

    const access = await canAccessWorkspace({
      actorUserId: req.user.id,
      ownerUserId: comment.workspaceOwnerId,
      permission: "comment",
    });
    if (!access.allowed) return fail(res, { status: 403, message: "You do not have permission to reply to this comment" });

    const replyText = sanitizeText(req.body?.comment || "", 3000);
    if (!replyText) return fail(res, { status: 400, message: "comment is required" });

    comment.replies.push({ actorUserId: req.user.id, comment: replyText });
    await comment.save();

    await recordAuditEvent({
      userId: comment.workspaceOwnerId,
      eventType: "reviewer_comment_replied",
      entityType: "ReviewComment",
      entityId: comment._id,
      fieldKey: comment.fieldKey,
      newValue: replyText,
      sourceType: "manual",
      actorType: "user",
      metadata: { actorUserId: req.user.id },
    });

    if (String(req.user.id) === String(comment.workspaceOwnerId)) {
      const reviewer = await User.findById(comment.reviewerUserId).select("email").lean();
      await createNotification({
        userId: comment.reviewerUserId,
        recipientEmail: reviewer?.email,
        type: "reviewer_comment",
        title: "Taxpayer replied to a review comment",
        message: "A taxpayer replied to a comment in a shared TaxBee workspace.",
        metadata: { commentId: String(comment._id), ownerUserId: String(comment.workspaceOwnerId) },
        dedupeKey: `review-comment-reply:${comment._id}:${comment.replies.length}`,
        priority: 1,
      });
    }

    res.status(200).json({
      success: true,
      message: "Review comment reply added",
      data: { comment: serializeComment(comment) },
    });
  } catch (error) {
    logger.error("replyToComment error", error, { requestId: req.requestId });
    fail(res, { status: error.status || 500, message: error.status ? error.message : "Server error while replying to comment" });
  }
};

export const setCommentStatus = async (req, res) => {
  try {
    requireObjectId(req.params.id);
    const nextStatus = req.body?.status === "open" ? "open" : "resolved";
    const comment = await ReviewComment.findById(req.params.id);
    if (!comment) return fail(res, { status: 404, message: "Comment not found" });

    const access = await canAccessWorkspace({
      actorUserId: req.user.id,
      ownerUserId: comment.workspaceOwnerId,
      permission: "comment",
    });
    if (!access.allowed) return fail(res, { status: 403, message: "You do not have permission to update this comment" });

    const previousStatus = comment.status;
    comment.status = nextStatus;
    comment.resolvedAt = nextStatus === "resolved" ? new Date() : null;
    await comment.save();

    await recordAuditEvent({
      userId: comment.workspaceOwnerId,
      eventType: nextStatus === "resolved" ? "reviewer_comment_resolved" : "reviewer_comment_reopened",
      entityType: "ReviewComment",
      entityId: comment._id,
      fieldKey: comment.fieldKey,
      oldValue: previousStatus,
      newValue: nextStatus,
      sourceType: "manual",
      actorType: "user",
      metadata: { actorUserId: req.user.id },
    });

    res.status(200).json({
      success: true,
      message: nextStatus === "resolved" ? "Review comment resolved" : "Review comment reopened",
      data: { comment: serializeComment(comment) },
    });
  } catch (error) {
    logger.error("setCommentStatus error", error, { requestId: req.requestId });
    fail(res, { status: error.status || 500, message: error.status ? error.message : "Server error while updating comment" });
  }
};

export const resolveComment = (req, res) => {
  req.body = { ...(req.body || {}), status: "resolved" };
  return setCommentStatus(req, res);
};

export const listReviewerWorkspaces = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("email name").lean();
    if (!user) return fail(res, { status: 404, message: "Authenticated user was not found" });

    const workspaces = await WorkspaceAccess.find({
      status: "accepted",
      $or: [{ reviewerUserId: req.user.id }, { reviewerEmail: user.email }],
    })
      .populate("ownerUserId", "name email")
      .sort({ invitedAt: -1 })
      .limit(100)
      .lean();

    const enriched = await Promise.all(
      workspaces.map(async (workspace) => {
        const context = await getUserTaxContext(String(workspace.ownerUserId?._id || workspace.ownerUserId));
        const taxIntelligence = buildTaxIntelligenceReport(context || {});
        const [comments, actions] = await Promise.all([
          ReviewComment.find({ workspaceOwnerId: workspace.ownerUserId }).select("status").lean(),
          ReviewAction.find({ workspaceOwnerId: workspace.ownerUserId }).select("action").lean(),
        ]);
        return {
          ...serializeWorkspaceAccess(workspace),
          summary: workspaceSummaryFrom({
            context: context ? { ...context, taxIntelligence } : {},
            comments,
            actions,
          }),
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Reviewer workspaces fetched",
      data: { workspaces: enriched },
    });
  } catch (error) {
    logger.error("listReviewerWorkspaces error", error, { requestId: req.requestId });
    fail(res, { status: 500, message: "Server error while fetching reviewer workspaces" });
  }
};

export const getReviewerWorkspace = async (req, res) => {
  try {
    const pagination = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
    const ownerId = req.params.ownerId;
    requireObjectId(ownerId, "ownerId");
    const access = await canAccessWorkspace({
      actorUserId: req.user.id,
      ownerUserId: ownerId,
      permission: "viewDocuments",
    });
    if (!access.allowed) return fail(res, { status: 403, message: "You do not have permission to view this workspace" });

    const [context, comments, actions] = await Promise.all([
      getUserTaxContext(ownerId),
      ReviewComment.find({ workspaceOwnerId: ownerId })
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit + 1)
        .lean(),
      ReviewAction.find({ workspaceOwnerId: ownerId }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    const commentsPage = pageResult(comments, pagination);
    if (!context) return fail(res, { status: 404, message: "Workspace owner was not found" });

    const taxIntelligence = buildTaxIntelligenceReport(context);
    res.status(200).json({
      success: true,
      message: "Reviewer workspace fetched",
      data: {
        context: { ...context, taxIntelligence, intelligence: taxIntelligence.legacy },
        comments: commentsPage.items.map(serializeComment),
        commentsPagination: commentsPage.pagination,
        reviewActions: actions.map(serializeReviewAction),
        summary: workspaceSummaryFrom({
          context: { ...context, taxIntelligence },
          comments,
          actions,
        }),
        permissions: access.access?.permissions || {},
      },
    });
  } catch (error) {
    logger.error("getReviewerWorkspace error", error, { requestId: req.requestId });
    fail(res, { status: error.status || 500, message: error.status ? error.message : "Server error while fetching reviewer workspace" });
  }
};

export const getReviewerWorkspaceSummary = async (req, res) => {
  try {
    const ownerId = req.params.ownerId;
    requireObjectId(ownerId, "ownerId");
    const access = await canAccessWorkspace({
      actorUserId: req.user.id,
      ownerUserId: ownerId,
      permission: "viewDocuments",
    });
    if (!access.allowed) return fail(res, { status: 403, message: "You do not have permission to view this workspace" });

    const [context, comments, actions] = await Promise.all([
      getUserTaxContext(ownerId),
      ReviewComment.find({ workspaceOwnerId: ownerId }).select("status").lean(),
      ReviewAction.find({ workspaceOwnerId: ownerId }).select("action").lean(),
    ]);
    const taxIntelligence = buildTaxIntelligenceReport(context || {});
    res.status(200).json({
      success: true,
      message: "Reviewer workspace summary fetched",
      data: {
        summary: workspaceSummaryFrom({
          context: context ? { ...context, taxIntelligence } : {},
          comments,
          actions,
        }),
      },
    });
  } catch (error) {
    logger.error("getReviewerWorkspaceSummary error", error, { requestId: req.requestId });
    fail(res, { status: error.status || 500, message: error.status ? error.message : "Server error while fetching workspace summary" });
  }
};

export const listCommentThreads = async (req, res) => {
  try {
    const ownerId = req.params.ownerId;
    requireObjectId(ownerId, "ownerId");
    const access = await canAccessWorkspace({
      actorUserId: req.user.id,
      ownerUserId: ownerId,
      permission: "comment",
    });
    if (!access.allowed) return fail(res, { status: 403, message: "You do not have permission to view comment threads" });

    const comments = await ReviewComment.find({ workspaceOwnerId: ownerId })
      .sort({ status: 1, createdAt: -1 })
      .limit(200)
      .lean();

    res.status(200).json({
      success: true,
      message: "Comment threads fetched",
      data: { comments: comments.map(serializeComment) },
    });
  } catch (error) {
    logger.error("listCommentThreads error", error, { requestId: req.requestId });
    fail(res, { status: error.status || 500, message: error.status ? error.message : "Server error while fetching comment threads" });
  }
};

export const createFieldReviewAction = async (req, res) => {
  try {
    const ownerId = req.params.ownerId;
    requireObjectId(ownerId, "ownerId");
    requireObjectId(req.body?.importedDocumentId, "importedDocumentId");
    const actionName = ["approved", "rejected", "flagged", "correction_requested"].includes(req.body?.action)
      ? req.body.action
      : "";
    if (!actionName) return fail(res, { status: 400, message: "Valid action is required" });

    const permission = actionName === "approved" ? "approve" : "reviewFields";
    const access = await canAccessWorkspace({
      actorUserId: req.user.id,
      ownerUserId: ownerId,
      permission,
    });
    if (!access.allowed) return fail(res, { status: 403, message: `You do not have permission to ${actionName} fields` });

    const fieldKey = sanitizeText(req.body?.fieldKey || "", 200);
    if (!fieldKey) return fail(res, { status: 400, message: "fieldKey is required" });

    const importedDocument = await ImportedDocument.findOne({
      _id: req.body.importedDocumentId,
      userId: ownerId,
      deletedAt: null,
    });
    if (!importedDocument) return fail(res, { status: 404, message: "Import not found" });

    const field = (importedDocument.extractedFields || []).find((item) => item.path === fieldKey);
    if (!field) return fail(res, { status: 404, message: "Extracted field not found" });

    const previousStatus = field.status;
    if (actionName === "approved") {
      field.status = field.value === field.originalValue ? "confirmed" : "overridden";
      field.updatedAt = new Date();
      importedDocument.reviewStatus = importedDocument.extractedFields.every((item) => item.status !== "extracted")
        ? "confirmed"
        : "extracted";
      await importedDocument.save();
      invalidateUserTaxContextCache(ownerId);
    }

    const reason = sanitizeText(req.body?.reason || "", 1000);
    const action = await ReviewAction.create({
      workspaceOwnerId: ownerId,
      reviewerUserId: req.user.id,
      importedDocumentId: importedDocument._id,
      fieldKey,
      fieldLabel: field.label,
      action: actionName,
      reason,
    });

    if (["rejected", "flagged", "correction_requested"].includes(actionName) && reason) {
      await ReviewComment.create({
        workspaceOwnerId: ownerId,
        reviewerUserId: req.user.id,
        entityType: "tax_field",
        entityId: String(importedDocument._id),
        fieldKey,
        comment: reason,
      });
    }

    await recordAuditEvent({
      userId: ownerId,
      eventType: `reviewer_field_${actionName}`,
      entityType: "ImportedDocument",
      entityId: importedDocument._id,
      fieldKey,
      oldValue: previousStatus,
      newValue: actionName === "approved" ? field.status : reason || actionName,
      sourceType: "manual",
      sourceDocumentId: importedDocument._id,
      confidence: field.confidence,
      actorType: "user",
      metadata: {
        reviewerUserId: req.user.id,
        fieldLabel: field.label,
        fileName: importedDocument.fileName,
        actionId: String(action._id),
      },
    });

    await notifyWorkspaceUser({
      userId: ownerId,
      type: "reviewer_comment",
      title: `Reviewer ${actionName.replace("_", " ")} a field`,
      message: `A reviewer ${actionName.replace("_", " ")} ${field.label || fieldKey} in your TaxBee workspace.`,
      metadata: { actionId: String(action._id), fieldKey, importedDocumentId: String(importedDocument._id) },
      dedupeKey: `reviewer-field-action:${action._id}`,
      priority: 1,
    });

    res.status(201).json({
      success: true,
      message: "Review action recorded",
      data: { action: serializeReviewAction(action) },
    });
  } catch (error) {
    logger.error("createFieldReviewAction error", error, { requestId: req.requestId });
    fail(res, { status: error.status || 500, message: error.status ? error.message : "Server error while recording review action" });
  }
};
