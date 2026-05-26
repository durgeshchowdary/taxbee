import assert from "node:assert/strict";
import { mock, test } from "node:test";
import AuditEvent from "../models/AuditEvent.js";
import { recordAuditEvent, recordAuditEvents } from "./auditTrailService.js";

test("recordAuditEvent sanitizes values and metadata before persistence", async (t) => {
  t.after(() => mock.restoreAll());
  let created;
  mock.method(AuditEvent, "create", async (payload) => {
    created = payload;
    return payload;
  });

  await recordAuditEvent({
    userId: "507f1f77bcf86cd799439011",
    eventType: "deduction_update",
    entityType: "ITRDraft",
    fieldKey: "deductions.section80C",
    newValue: "ABCDEF1234G\u0000",
    metadata: {
      rawText: "full document",
      password: "secret",
      safe: "ok",
      $where: "bad",
    },
  });

  assert.equal(created.newValue, "ABCDEF1234G");
  assert.equal(created.metadata.rawText, undefined);
  assert.equal(created.metadata.password, undefined);
  assert.equal(created.metadata.$where, undefined);
  assert.equal(created.metadata.safe, "ok");
});

test("recordAuditEvents creates import/review/draft/comment style events in bulk", async (t) => {
  t.after(() => mock.restoreAll());
  let inserted;
  mock.method(AuditEvent, "insertMany", async (payload) => {
    inserted = payload;
    return payload;
  });

  await recordAuditEvents([
    { userId: "507f1f77bcf86cd799439011", eventType: "field_confirmation", newValue: "confirmed" },
    { userId: "507f1f77bcf86cd799439011", eventType: "itr_draft_update", newValue: "draft" },
    { userId: "507f1f77bcf86cd799439011", eventType: "reviewer_comment_added", newValue: "comment" },
  ]);

  assert.equal(inserted.length, 3);
  assert.deepEqual(inserted.map((event) => event.eventType), [
    "field_confirmation",
    "itr_draft_update",
    "reviewer_comment_added",
  ]);
});
