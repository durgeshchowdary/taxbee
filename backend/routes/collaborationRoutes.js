import express from "express";
import {
  acceptAccess,
  createComment,
  createFieldReviewAction,
  getAccess,
  getReviewerWorkspace,
  getReviewerWorkspaceSummary,
  inviteReviewer,
  listComments,
  listCommentThreads,
  listReviewerWorkspaces,
  replyToComment,
  resolveComment,
  setCommentStatus,
  revokeAccess,
} from "../controllers/collaborationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateBody } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.post(
  "/invite",
  validateBody({
    reviewerEmail: { type: "string", required: true, email: true, max: 254 },
    role: { type: "enum", values: ["reviewer", "ca", "viewer"], default: "reviewer" },
    permissions: { type: "object" },
  }),
  inviteReviewer
);
router.get("/access", getAccess);
router.patch("/access/:id/accept", acceptAccess);
router.patch("/access/:id/revoke", revokeAccess);
router.post(
  "/comments",
  validateBody({
    workspaceOwnerId: { type: "string", max: 80 },
    entityType: { type: "string", max: 80 },
    entityId: { type: "string", max: 120 },
    fieldKey: { type: "string", max: 200 },
    comment: { type: "string", required: true, max: 3000 },
  }),
  createComment
);
router.get("/comments", listComments);
router.patch("/comments/:id/resolve", resolveComment);
router.post(
  "/comments/:id/replies",
  validateBody({
    comment: { type: "string", required: true, max: 3000 },
  }),
  replyToComment
);
router.patch(
  "/comments/:id/status",
  validateBody({
    status: { type: "enum", values: ["open", "resolved"], required: true },
  }),
  setCommentStatus
);
router.get("/workspaces", listReviewerWorkspaces);
router.get("/workspaces/:ownerId/summary", getReviewerWorkspaceSummary);
router.get("/workspaces/:ownerId/threads", listCommentThreads);
router.post(
  "/workspaces/:ownerId/fields/actions",
  validateBody({
    importedDocumentId: { type: "string", required: true, max: 80 },
    fieldKey: { type: "string", required: true, max: 200 },
    action: { type: "enum", values: ["approved", "rejected", "flagged", "correction_requested"], required: true },
    reason: { type: "string", max: 1000 },
  }),
  createFieldReviewAction
);
router.get("/workspaces/:ownerId", getReviewerWorkspace);

export default router;
