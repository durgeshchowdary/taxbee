import assert from "node:assert/strict";
import { mock, test } from "node:test";
import AuditEvent from "../models/AuditEvent.js";
import Job from "../models/Job.js";
import Notification from "../models/Notification.js";
import { createNotification, sendEmailJob, serializeNotification } from "./notificationService.js";

test("createNotification stores a sanitized notification and queues encrypted email job", async (t) => {
  t.after(() => mock.restoreAll());
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  let createdNotification;
  let queuedJob;

  mock.method(Notification, "findOne", () => ({ lean: async () => null }));
  mock.method(Notification, "create", async (payload) => {
    createdNotification = payload;
    return { _id: "507f1f77bcf86cd799439031", ...payload };
  });
  mock.method(Job, "create", async (payload) => {
    queuedJob = payload;
    return {
      _id: "507f1f77bcf86cd799439032",
      type: payload.type,
      userId: payload.userId,
      inputRef: payload.inputRef,
      status: "queued",
    };
  });
  mock.method(AuditEvent, "create", async (payload) => payload);

  const notification = await createNotification({
    userId: "507f1f77bcf86cd799439011",
    recipientEmail: "USER@Example.com",
    type: "reviewer_comment",
    title: "New reviewer comment",
    message: "A reviewer added a comment. Open TaxBee to review it.",
    metadata: { amount: "1000000", token: "secret" },
    dedupeKey: "comment-1",
  });

  assert.equal(notification._id, "507f1f77bcf86cd799439031");
  assert.equal(createdNotification.recipientEmail, "user@example.com");
  assert.equal(createdNotification.emailStatus, "queued");
  assert.equal(queuedJob.type, "email_send");
  assert.equal(JSON.stringify(queuedJob.securePayload).includes("USER@Example.com"), false);
});

test("sendEmailJob marks notification skipped when no provider is configured", async (t) => {
  t.after(() => mock.restoreAll());
  delete process.env.SMTP_HOST;
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;

  const doc = {
    emailStatus: "queued",
    emailSentAt: null,
    emailFailureReason: "old",
    saveCalled: false,
    async save() {
      this.saveCalled = true;
      return this;
    },
  };
  mock.method(Notification, "findById", async () => doc);

  const result = await sendEmailJob({
    notificationId: "507f1f77bcf86cd799439031",
    to: "user@example.com",
    subject: "TaxBee",
    text: "Open TaxBee.",
  });

  assert.equal(result.emailStatus, "skipped");
  assert.equal(doc.emailStatus, "skipped");
  assert.equal(doc.saveCalled, true);
});

test("serializeNotification does not expose recipient email or internal failure details", () => {
  const serialized = serializeNotification({
    _id: "507f1f77bcf86cd799439031",
    type: "security_alert",
    title: "Security alert",
    message: "Unsuccessful login attempt.",
    status: "unread",
    emailStatus: "queued",
    recipientEmail: "user@example.com",
    emailFailureReason: "smtp secret",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    metadata: { reason: "invalid_credentials" },
  });

  assert.equal(serialized.recipientEmail, undefined);
  assert.equal(serialized.emailFailureReason, undefined);
  assert.equal(serialized.metadata.reason, "invalid_credentials");
});
