import assert from "node:assert/strict";
import test from "node:test";
import AuditEvent from "../models/AuditEvent.js";
import { logger } from "../utils/safeLogger.js";
import { recordAuthAuditEvent, recordAuthFailureAudit } from "./authAuditService.js";

const USER_ID = "507f1f77bcf86cd799439081";

test("recordAuthAuditEvent persists auth audit rows", async () => {
  const created = [];
  const originalCreate = AuditEvent.create;
  AuditEvent.create = async (doc) => {
    created.push(doc);
    return doc;
  };

  try {
    await recordAuthAuditEvent({
      userId: USER_ID,
      eventType: "auth_login_success",
      requestId: "req-auth-audit",
    });

    assert.equal(created.length, 1);
    assert.equal(created[0].eventType, "auth_login_success");
    assert.equal(created[0].entityType, "Auth");
    assert.equal(created[0].metadata.requestId, "req-auth-audit");
  } finally {
    AuditEvent.create = originalCreate;
  }
});

test("recordAuthFailureAudit skips persistence when userId is missing", async () => {
  const created = [];
  const warnings = [];
  const originalCreate = AuditEvent.create;
  const originalWarn = logger.warn;
  AuditEvent.create = async (doc) => {
    created.push(doc);
    return doc;
  };
  logger.warn = (...args) => {
    warnings.push(args);
  };

  try {
    await recordAuthFailureAudit({
      reason: "invalid_credentials",
      requestId: "req-missing-user",
    });

    assert.equal(created.length, 0);
    assert.equal(warnings.length, 1);
  } finally {
    AuditEvent.create = originalCreate;
    logger.warn = originalWarn;
  }
});
