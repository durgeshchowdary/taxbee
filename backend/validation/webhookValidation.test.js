import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSafeWebhookUrl,
  createWebhookSchema,
  isPrivateAddress,
  normalizeWebhookEvents,
  validateWebhookPayload,
} from "./webhookValidation.js";

test("webhook validation accepts legacy event and normalizes to events", () => {
  const payload = validateWebhookPayload(createWebhookSchema, {
    name: "Invoice hook",
    url: "https://8.8.8.8/taxbee",
    event: "invoice.created",
  });

  assert.deepEqual(payload.events, ["invoice.created"]);
});

test("webhook validation deduplicates canonical events", () => {
  assert.deepEqual(
    normalizeWebhookEvents({ events: ["payment.paid", "payment.paid", "invoice.created"] }),
    ["payment.paid", "invoice.created"]
  );
});

test("webhook URL validation rejects localhost and private networks", async () => {
  await assert.rejects(() => assertSafeWebhookUrl("http://localhost:3000/hook"), /restricted host/);
  await assert.rejects(() => assertSafeWebhookUrl("http://127.0.0.1/hook"), /private network/);
  await assert.rejects(() => assertSafeWebhookUrl("http://192.168.1.20/hook"), /private network/);
});

test("private address helper blocks metadata, loopback, and RFC1918 ranges", () => {
  assert.equal(isPrivateAddress("169.254.169.254"), true);
  assert.equal(isPrivateAddress("10.0.0.10"), true);
  assert.equal(isPrivateAddress("172.16.1.1"), true);
  assert.equal(isPrivateAddress("8.8.8.8"), false);
});
