import assert from "node:assert/strict";
import test from "node:test";
import { decryptPayload, encryptPayload, serializeJob } from "./jobQueueService.js";

test("encrypted job payload round-trips without exposing plaintext fields", () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  const payload = {
    upload: {
      fileName: "ais.pdf",
      fileBase64: "sensitive-content",
    },
  };

  const encrypted = encryptPayload(payload);

  assert.equal(encrypted.alg, "aes-256-gcm");
  assert.equal(JSON.stringify(encrypted).includes("sensitive-content"), false);
  assert.deepEqual(decryptPayload(encrypted), payload);
});

test("serializeJob returns status and references only", () => {
  const job = {
    _id: "507f1f77bcf86cd799439011",
    type: "document_extraction",
    status: "queued",
    attempts: 0,
    maxAttempts: 3,
    failureReason: "",
    inputRef: { importedDocumentId: "507f1f77bcf86cd799439012" },
    resultRef: {},
    securePayload: { ciphertext: "hidden" },
  };

  const serialized = serializeJob(job);

  assert.equal(serialized.id, "507f1f77bcf86cd799439011");
  assert.equal(serialized.status, "queued");
  assert.equal(Object.hasOwn(serialized, "securePayload"), false);
});
