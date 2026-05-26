import assert from "node:assert/strict";
import { mock, test } from "node:test";
import User from "../models/user.js";
import WorkspaceAccess from "../models/WorkspaceAccess.js";
import { canAccessWorkspace } from "./workspaceAccessService.js";

const query = (value) => ({ lean: async () => value });

test("owner can access their own workspace", async () => {
  const result = await canAccessWorkspace({
    actorUserId: "507f1f77bcf86cd799439011",
    ownerUserId: "507f1f77bcf86cd799439011",
    permission: "viewDocuments",
  });

  assert.equal(result.allowed, true);
  assert.equal(result.isOwner, true);
});

test("accepted reviewer can access only granted workspace permissions", async (t) => {
  t.after(() => mock.restoreAll());
  mock.method(User, "findById", () => query({ _id: "507f1f77bcf86cd799439012", email: "reviewer@example.com" }));
  mock.method(WorkspaceAccess, "findOne", () =>
    query({
      _id: "507f1f77bcf86cd799439099",
      ownerUserId: "507f1f77bcf86cd799439011",
      reviewerUserId: "507f1f77bcf86cd799439012",
      reviewerEmail: "reviewer@example.com",
      status: "accepted",
      permissions: { viewDocuments: true, editDraft: false },
    })
  );

  const view = await canAccessWorkspace({
    actorUserId: "507f1f77bcf86cd799439012",
    ownerUserId: "507f1f77bcf86cd799439011",
    permission: "viewDocuments",
  });
  const edit = await canAccessWorkspace({
    actorUserId: "507f1f77bcf86cd799439012",
    ownerUserId: "507f1f77bcf86cd799439011",
    permission: "editDraft",
  });

  assert.equal(view.allowed, true);
  assert.equal(edit.allowed, false);
});

test("revoked reviewer cannot access shared workspace", async (t) => {
  t.after(() => mock.restoreAll());
  mock.method(User, "findById", () => query({ _id: "507f1f77bcf86cd799439012", email: "reviewer@example.com" }));
  mock.method(WorkspaceAccess, "findOne", () => query(null));

  const result = await canAccessWorkspace({
    actorUserId: "507f1f77bcf86cd799439012",
    ownerUserId: "507f1f77bcf86cd799439011",
    permission: "viewDocuments",
  });

  assert.equal(result.allowed, false);
});

test("ownerId tampering with invalid ObjectId is blocked", async () => {
  const result = await canAccessWorkspace({
    actorUserId: "507f1f77bcf86cd799439012",
    ownerUserId: "{ $ne: null }",
    permission: "viewDocuments",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.ownerUserId, null);
});
