import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import User from "../models/user.js";
import WorkspaceAccess from "../models/WorkspaceAccess.js";
import ReviewComment from "../models/ReviewComment.js";
import ReviewAction from "../models/ReviewAction.js";
import ImportedDocument from "../models/ImportedDocument.js";
import ITRDraft from "../models/ITRDraft.js";
import AuditEvent from "../models/AuditEvent.js";
import Notification from "../models/Notification.js";
import Job from "../models/Job.js";
import {
  createComment,
  createFieldReviewAction,
  listComments,
  listReviewerWorkspaces,
  replyToComment,
  setCommentStatus,
} from "./collaborationController.js";

const OWNER_ID = new mongoose.Types.ObjectId("507f1f77bcf86cd799439111");
const REVIEWER_ID = new mongoose.Types.ObjectId("507f1f77bcf86cd799439112");
const IMPORT_ID = new mongoose.Types.ObjectId("507f1f77bcf86cd799439113");

const mockResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const selectableLean = (value) => ({
  lean: async () => value,
  select: () => ({ lean: async () => value }),
});

const queryChain = (value) => ({
  populate: () => queryChain(value),
  sort: () => queryChain(value),
  limit: () => ({ lean: async () => value }),
});

const commentsQuery = (value) => ({
  sort: () => commentsQuery(value),
  skip: () => commentsQuery(value),
  limit: () => ({ lean: async () => value }),
  select: () => ({ lean: async () => value }),
  lean: async () => value,
});

const dbQuery = (value) => ({
  select: () => dbQuery(value),
  sort: () => dbQuery(value),
  limit: () => dbQuery(value),
  lean: async () => value,
});

const withPatchedModels = async (patches, fn) => {
  const originals = [];
  for (const [model, method, replacement] of patches) {
    originals.push([model, method, model[method]]);
    model[method] = replacement;
  }
  try {
    return await fn();
  } finally {
    for (const [model, method, original] of originals.reverse()) {
      model[method] = original;
    }
  }
};

test("reviewer workspaces list returns only accepted workspaces with summary", async () => {
  let workspaceQuery;
  await withPatchedModels(
    [
      [User, "findById", () => selectableLean({ _id: REVIEWER_ID, email: "ca@example.com", name: "CA" })],
      [
        WorkspaceAccess,
        "find",
        (query) => {
          workspaceQuery = query;
          return queryChain([
            {
              _id: new mongoose.Types.ObjectId(),
              ownerUserId: { _id: OWNER_ID, name: "Taxpayer", email: "owner@example.com" },
              reviewerEmail: "ca@example.com",
              reviewerUserId: REVIEWER_ID,
              role: "ca",
              status: "accepted",
              permissions: { viewDocuments: true, reviewFields: true, comment: true, approve: true },
            },
          ]);
        },
      ],
      [ReviewComment, "find", () => commentsQuery([{ status: "open" }])],
      [ReviewAction, "find", () => commentsQuery([{ action: "approved" }])],
      [ITRDraft, "findOne", () => ({ lean: async () => null })],
      [ImportedDocument, "find", () => dbQuery([
        {
          _id: IMPORT_ID,
          documentType: "FORM_16",
          fileName: "form16.pdf",
          reviewStatus: "extracted",
          extractedFields: [{ fieldId: "f1", path: "salary.salary17_1", label: "Salary", value: "1000000", status: "extracted" }],
          totals: {},
        },
      ])],
      [AuditEvent, "find", () => dbQuery([])],
    ],
    async () => {
      const res = mockResponse();
      await listReviewerWorkspaces({ user: { id: String(REVIEWER_ID) }, requestId: "req-workspaces" }, res);

      assert.equal(res.statusCode, 200);
      assert.equal(workspaceQuery.status, "accepted");
      assert.equal(res.body.data.workspaces.length, 1);
      assert.equal(res.body.data.workspaces[0].summary.unresolvedComments, 1);
    }
  );
});

test("reviewer without approve permission cannot approve extracted fields", async () => {
  await withPatchedModels(
    [
      [User, "findById", () => selectableLean({ _id: REVIEWER_ID, email: "ca@example.com" })],
      [
        WorkspaceAccess,
        "findOne",
        () => ({
          lean: async () => ({
            _id: new mongoose.Types.ObjectId(),
            permissions: { viewDocuments: true, reviewFields: true, comment: true, approve: false },
          }),
        }),
      ],
    ],
    async () => {
      const res = mockResponse();
      await createFieldReviewAction(
        {
          user: { id: String(REVIEWER_ID) },
          params: { ownerId: String(OWNER_ID) },
          body: { importedDocumentId: String(IMPORT_ID), fieldKey: "salary.salary17_1", action: "approved" },
          requestId: "req-no-approve",
        },
        res
      );

      assert.equal(res.statusCode, 403);
    }
  );
});

test("comment thread creation, reply, resolve, and taxpayer feedback listing work", async () => {
  const commentId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439114");
  const commentDoc = {
    _id: commentId,
    workspaceOwnerId: OWNER_ID,
    reviewerUserId: REVIEWER_ID,
    entityType: "tax_field",
    entityId: "",
    fieldKey: "salary.salary17_1",
    comment: "Please verify salary breakup.",
    status: "open",
    replies: [],
    save: async function save() {
      return this;
    },
  };
  let auditEvents = 0;
  let notifications = 0;

  await withPatchedModels(
    [
      [User, "findById", () => selectableLean({ _id: OWNER_ID, email: "owner@example.com", name: "Owner" })],
      [ReviewComment, "create", async () => commentDoc],
      [ReviewComment, "findById", async () => commentDoc],
      [ReviewComment, "find", () => commentsQuery([commentDoc])],
      [ReviewAction, "find", () => commentsQuery([{ _id: new mongoose.Types.ObjectId(), action: "flagged", fieldKey: "salary.salary17_1" }])],
      [AuditEvent, "create", async () => { auditEvents += 1; return { _id: new mongoose.Types.ObjectId() }; }],
      [Notification, "findOne", () => ({ lean: async () => null })],
      [Notification, "create", async () => { notifications += 1; return { _id: new mongoose.Types.ObjectId() }; }],
      [Job, "create", async () => ({ _id: new mongoose.Types.ObjectId(), type: "email_send", inputRef: {} })],
    ],
    async () => {
      const createRes = mockResponse();
      await createComment(
        {
          user: { id: String(OWNER_ID) },
          body: { workspaceOwnerId: String(OWNER_ID), fieldKey: "salary.salary17_1", comment: "Please verify salary breakup." },
          requestId: "req-comment",
        },
        createRes
      );
      assert.equal(createRes.statusCode, 201);

      const replyRes = mockResponse();
      await replyToComment(
        { user: { id: String(OWNER_ID) }, params: { id: String(commentId) }, body: { comment: "Uploaded clarification." }, requestId: "req-reply" },
        replyRes
      );
      assert.equal(replyRes.statusCode, 200);
      assert.equal(commentDoc.replies.length, 1);

      const resolveRes = mockResponse();
      await setCommentStatus(
        { user: { id: String(OWNER_ID) }, params: { id: String(commentId) }, body: { status: "resolved" }, requestId: "req-resolve" },
        resolveRes
      );
      assert.equal(resolveRes.statusCode, 200);
      assert.equal(commentDoc.status, "resolved");

      const listRes = mockResponse();
      await listComments({ user: { id: String(OWNER_ID) }, query: {}, requestId: "req-list" }, listRes);
      assert.equal(listRes.statusCode, 200);
      assert.equal(listRes.body.data.comments.length, 1);
      assert.equal(listRes.body.data.reviewActions.length, 1);
      assert.ok(auditEvents >= 3);
      assert.ok(notifications >= 1);
    }
  );
});

test("field review action creates audit event, notification, and approval updates the imported field", async () => {
  const importedDocument = {
    _id: IMPORT_ID,
    fileName: "form16.pdf",
    extractedFields: [
      {
        path: "salary.salary17_1",
        label: "Salary",
        value: "1000000",
        originalValue: "1000000",
        status: "extracted",
        confidence: 96,
      },
    ],
    saveCalls: 0,
    save: async function save() {
      this.saveCalls += 1;
      return this;
    },
  };
  let auditEvents = 0;
  let notifications = 0;

  await withPatchedModels(
    [
      [User, "findById", () => selectableLean({ _id: REVIEWER_ID, email: "owner@example.com" })],
      [
        WorkspaceAccess,
        "findOne",
        () => ({
          lean: async () => ({
            _id: new mongoose.Types.ObjectId(),
            permissions: { viewDocuments: true, reviewFields: true, comment: true, approve: true },
          }),
        }),
      ],
      [ImportedDocument, "findOne", async () => importedDocument],
      [ReviewAction, "create", async (payload) => ({ _id: new mongoose.Types.ObjectId(), createdAt: new Date(), ...payload })],
      [AuditEvent, "create", async () => { auditEvents += 1; return { _id: new mongoose.Types.ObjectId() }; }],
      [Notification, "findOne", () => ({ lean: async () => null })],
      [Notification, "create", async () => { notifications += 1; return { _id: new mongoose.Types.ObjectId() }; }],
      [Job, "create", async () => ({ _id: new mongoose.Types.ObjectId(), type: "email_send", inputRef: {} })],
    ],
    async () => {
      const res = mockResponse();
      await createFieldReviewAction(
        {
          user: { id: String(REVIEWER_ID) },
          params: { ownerId: String(OWNER_ID) },
          body: {
            importedDocumentId: String(IMPORT_ID),
            fieldKey: "salary.salary17_1",
            action: "approved",
          },
          requestId: "req-approve",
        },
        res
      );

      assert.equal(res.statusCode, 201);
      assert.equal(importedDocument.extractedFields[0].status, "confirmed");
      assert.equal(importedDocument.saveCalls, 1);
      assert.ok(auditEvents >= 2);
      assert.ok(notifications >= 1);
    }
  );
});
