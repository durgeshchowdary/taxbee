import mongoose from "mongoose";
import ReviewAssignment from "../models/ReviewAssignment.js";
import ReviewAction from "../models/ReviewAction.js";
import ReviewComment from "../models/ReviewComment.js";
import ImportedDocument from "../models/ImportedDocument.js";
import { recordAuditEvent } from "./auditTrailService.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

export const createReviewAssignment = async ({
  workspaceOwnerId,
  reviewerUserId,
  importedDocumentId = null,
  title,
  description = "",
  priority = "normal",
  dueAt = null,
}) => {
  if (!isValidObjectId(workspaceOwnerId) || !isValidObjectId(reviewerUserId)) {
    return null;
  }

  const assignment = await ReviewAssignment.create({
    workspaceOwnerId,
    reviewerUserId,
    importedDocumentId: isValidObjectId(importedDocumentId) ? importedDocumentId : null,
    title,
    description,
    priority,
    dueAt: dueAt ? new Date(dueAt) : null,
  });

  await recordAuditEvent({
    userId: workspaceOwnerId,
    eventType: "review_assignment_created",
    entityType: "ReviewAssignment",
    entityId: String(assignment._id),
    sourceType: "system",
    actorType: "user",
    metadata: {
      reviewerUserId,
      importedDocumentId,
      priority,
      dueAt,
    },
  });

  return assignment;
};

export const updateReviewAssignmentStatus = async ({
  workspaceOwnerId,
  assignmentId,
  status,
  actorUserId,
}) => {
  const set = {
    status,
    ...(status === "completed" ? { completedAt: new Date() } : {}),
    ...(status === "approved" ? { signOffAt: new Date(), signOffBy: actorUserId } : {}),
  };

  const assignment = await ReviewAssignment.findOneAndUpdate(
    {
      _id: assignmentId,
      workspaceOwnerId,
    },
    { $set: set },
    { new: true }
  );

  if (!assignment) return null;

  await recordAuditEvent({
    userId: workspaceOwnerId,
    eventType: "review_assignment_status_updated",
    entityType: "ReviewAssignment",
    entityId: String(assignment._id),
    sourceType: "system",
    actorType: "user",
    metadata: {
      status,
      actorUserId,
    },
  });

  return assignment;
};

export const getReviewBoard = async ({ workspaceOwnerId }) => {
  const [assignments, actions, comments, documentCount] = await Promise.all([
    ReviewAssignment.find({ workspaceOwnerId })
      .sort({ dueAt: 1, priority: -1, updatedAt: -1 })
      .limit(100)
      .lean(),

    ReviewAction.find({ workspaceOwnerId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),

    ReviewComment.find({ workspaceOwnerId, status: "open" })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),

    ImportedDocument.countDocuments({
      userId: workspaceOwnerId,
      deletedAt: null,
    }),
  ]);

  const statusCounts = assignments.reduce((acc, assignment) => {
    acc[assignment.status] = (acc[assignment.status] || 0) + 1;
    return acc;
  }, {});

  const actionCounts = actions.reduce((acc, action) => {
    acc[action.action] = (acc[action.action] || 0) + 1;
    return acc;
  }, {});

  return {
    metrics: {
      totalAssignments: assignments.length,
      openComments: comments.length,
      reviewedActions: actions.length,
      documentCount,
      statusCounts,
      actionCounts,
    },
    assignments,
    recentActions: actions.slice(0, 20),
    openComments: comments.slice(0, 20),
  };
};