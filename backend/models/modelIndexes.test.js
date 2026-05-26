import assert from "node:assert/strict";
import test from "node:test";
import AuditEvent from "./AuditEvent.js";
import ImportedDocument from "./ImportedDocument.js";
import ITRDraft from "./ITRDraft.js";
import Job from "./Job.js";
import Notification from "./Notification.js";
import ReviewComment from "./ReviewComment.js";
import User from "./user.js";
import WorkspaceAccess from "./WorkspaceAccess.js";

const hasIndex = (model, expected) =>
  model.schema.indexes().some(([fields]) => JSON.stringify(fields) === JSON.stringify(expected));

test("core models define production query indexes", () => {
  assert.equal(hasIndex(User, { isVerified: 1, createdAt: -1 }), true);
  assert.equal(hasIndex(User, { role: 1, createdAt: -1 }), true);
  assert.equal(hasIndex(ITRDraft, { updatedAt: -1 }), true);
  assert.equal(hasIndex(ImportedDocument, { userId: 1, deletedAt: 1, importedAt: -1, createdAt: -1 }), true);
  assert.equal(hasIndex(AuditEvent, { userId: 1, eventType: 1, timestamp: -1 }), true);
  assert.equal(hasIndex(Job, { type: 1, status: 1, runAfter: 1 }), true);
  assert.equal(hasIndex(Notification, { userId: 1, status: 1, createdAt: -1 }), true);
  assert.equal(hasIndex(WorkspaceAccess, { reviewerUserId: 1, status: 1, invitedAt: -1 }), true);
  assert.equal(hasIndex(ReviewComment, { workspaceOwnerId: 1, status: 1, createdAt: -1 }), true);
});
