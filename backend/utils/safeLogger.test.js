import assert from "node:assert/strict";
import test from "node:test";
import { logger } from "./safeLogger.js";

test("safe logger redacts PAN, Aadhaar, tokens, and large financial-looking values", () => {
  const redacted = logger.redact({
    authorization: "Bearer abc",
    message: "PAN ABCDE1234F Aadhaar 1234 5678 9012 income 12,34,567",
    amount: 1250000,
  });

  assert.equal(redacted.authorization, "[REDACTED]");
  assert.match(redacted.message, /\[REDACTED_PAN\]/);
  assert.match(redacted.message, /\[REDACTED_AADHAAR\]/);
  assert.match(redacted.message, /\[REDACTED_NUMBER\]/);
  assert.equal(redacted.amount, "[REDACTED_NUMBER]");
});

test("safe logger emits structured JSON", () => {
  const originalLog = console.log;
  let line = "";
  console.log = (value) => {
    line = value;
  };

  try {
    logger.info("test_event", { requestId: "req-1" });
  } finally {
    console.log = originalLog;
  }

  const parsed = JSON.parse(line);
  assert.equal(parsed.level, "info");
  assert.equal(parsed.message, "test_event");
  assert.equal(parsed.requestId, "req-1");
});
