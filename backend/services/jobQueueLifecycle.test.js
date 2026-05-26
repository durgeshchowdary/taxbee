import assert from "node:assert/strict";
import { mock, test } from "node:test";
import AuditEvent from "../models/AuditEvent.js";
import Job from "../models/Job.js";
import { claimNextJob, completeJob, failJob } from "./jobQueueService.js";

const jobId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";

test("job lifecycle can move queued to processing to completed and clears secure payload", async (t) => {
  t.after(() => mock.restoreAll());
  mock.method(AuditEvent, "create", async (payload) => payload);

  const processingJob = {
    _id: jobId,
    type: "document_extraction",
    status: "processing",
    userId,
    attempts: 1,
    maxAttempts: 3,
    inputRef: {},
    select() {
      return Promise.resolve(this);
    },
  };
  let completionUpdate;

  mock.method(Job, "findOneAndUpdate", () => processingJob);
  mock.method(Job, "findByIdAndUpdate", async (_id, update) => {
    completionUpdate = update.$set;
    return { ...processingJob, ...completionUpdate };
  });

  const claimed = await claimNextJob({ workerId: "worker-1" });
  const completed = await completeJob(claimed, { importedDocumentId: "507f1f77bcf86cd799439013" });

  assert.equal(claimed.status, "processing");
  assert.equal(completed.status, "completed");
  assert.equal(completionUpdate.securePayload, null);
  assert.equal(completionUpdate.lockedAt, null);
});

test("failed jobs retry before final failure and clear secure payload on final failure", async (t) => {
  t.after(() => mock.restoreAll());
  mock.method(AuditEvent, "create", async (payload) => payload);

  const updates = [];
  mock.method(Job, "findByIdAndUpdate", async (_id, update) => {
    updates.push(update.$set);
    return { _id, ...update.$set };
  });

  await failJob({ _id: jobId, type: "document_extraction", userId, attempts: 1, maxAttempts: 3 }, new Error("temporary"));
  await failJob({ _id: jobId, type: "document_extraction", userId, attempts: 3, maxAttempts: 3 }, new Error("final"));

  assert.equal(updates[0].status, "queued");
  assert.equal(updates[0].securePayload, undefined);
  assert.equal(updates[1].status, "failed");
  assert.equal(updates[1].securePayload, null);
});
