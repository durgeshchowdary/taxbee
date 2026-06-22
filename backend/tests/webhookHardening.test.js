import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import axios from "axios";

import Webhook from "../models/Webhook.js";
import WebhookLog from "../models/WebhookLog.js";
import WebhookRetry from "../models/WebhookRetry.js";
import AuditEvent from "../models/AuditEvent.js";
import {
  createWebhook,
  disableWebhook,
  updateWebhook,
} from "../services/webhookService.js";
import { deliverEvent } from "../services/webhookDeliveryService.js";
import { getWebhookAnalytics } from "../services/webhookAnalyticsService.js";
import {
  decryptWebhookSecret,
  encryptWebhookSecret,
  isEncryptedWebhookSecret,
} from "../services/webhookSignatureService.js";

const USER_ID = new mongoose.Types.ObjectId();

const withPatched = async (patches, callback) => {
  const originals = patches.map(([target, key]) => [target, key, target[key]]);
  for (const [target, key, value] of patches) target[key] = value;
  try {
    return await callback();
  } finally {
    for (const [target, key, value] of originals) target[key] = value;
  }
};

test("webhook schema encrypts secrets before persistence", async () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  const doc = new Webhook({
    userId: USER_ID,
    name: "Secure hook",
    url: "https://8.8.8.8/taxbee",
    events: ["invoice.created"],
    secret: "plain-secret",
  });

  await doc.validate();

  assert.equal(isEncryptedWebhookSecret(doc.secret), true);
  assert.equal(decryptWebhookSecret(doc.secret), "plain-secret");
});

test("createWebhook writes canonical events and records audit event", async () => {
  process.env.WEBHOOK_SSRF_DNS_LOOKUP = "false";
  const created = [];
  const auditEvents = [];

  await withPatched([
    [Webhook, "create", async (payload) => {
      created.push(payload);
      return { _id: new mongoose.Types.ObjectId(), ...payload, toObject() { return { _id: this._id, ...payload }; } };
    }],
    [AuditEvent, "create", async (payload) => {
      auditEvents.push(payload);
      return payload;
    }],
  ], async () => {
    const result = await createWebhook(String(USER_ID), {
      name: "Invoice hook",
      url: "https://hooks.taxbee.example/invoice",
      event: "invoice.created",
    });

    assert.deepEqual(created[0].events, ["invoice.created"]);
    assert.equal(Object.hasOwn(created[0], "event"), false);
    assert.equal(result.secret.length, 64);
    assert.equal(auditEvents[0].eventType, "WEBHOOK_CREATED");
  });
});

test("updateWebhook updates canonical fields and unsets legacy event", async () => {
  process.env.WEBHOOK_SSRF_DNS_LOOKUP = "false";
  let query;
  let update;

  await withPatched([
    [Webhook, "findOneAndUpdate", (nextQuery, nextUpdate) => {
      query = nextQuery;
      update = nextUpdate;
      return {
        select: async () => ({
          _id: new mongoose.Types.ObjectId(),
          userId: USER_ID,
          name: "Updated",
          url: nextUpdate.$set.url,
          events: nextUpdate.$set.events,
          secret: encryptWebhookSecret("secret"),
          toObject() {
            return this;
          },
        }),
      };
    }],
    [AuditEvent, "create", async (payload) => payload],
  ], async () => {
    const result = await updateWebhook("507f1f77bcf86cd799439011", String(USER_ID), {
      url: "https://hooks.taxbee.example/updated",
      events: ["payment.paid"],
    });

    assert.equal(String(query.userId), String(USER_ID));
    assert.deepEqual(update.$set.events, ["payment.paid"]);
    assert.deepEqual(update.$unset, { event: "" });
    assert.deepEqual(result.events, ["payment.paid"]);
  });
});

test("disableWebhook is tenant-scoped and records audit event", async () => {
  let query;
  const auditEvents = [];

  await withPatched([
    [Webhook, "findOneAndUpdate", (nextQuery) => {
      query = nextQuery;
      return {
        select: async () => ({
          _id: new mongoose.Types.ObjectId(),
          userId: USER_ID,
          events: ["invoice.created"],
          status: "disabled",
          secret: encryptWebhookSecret("secret"),
          toObject() {
            return this;
          },
        }),
      };
    }],
    [AuditEvent, "create", async (payload) => {
      auditEvents.push(payload);
      return payload;
    }],
  ], async () => {
    await disableWebhook("507f1f77bcf86cd799439011", String(USER_ID));

    assert.equal(String(query.userId), String(USER_ID));
    assert.equal(auditEvents[0].eventType, "WEBHOOK_DISABLED");
  });
});

test("webhook analytics counts delivery status values", async () => {
  await withPatched([
    [Webhook, "find", () => ({
      select: () => ({
        lean: async () => [{ _id: "hook-1", events: ["invoice.created"], url: "https://example.com" }],
      }),
    })],
    [WebhookLog, "find", () => ({
      lean: async () => [
        { status: "success", responseTimeMs: 10, createdAt: new Date("2026-01-01") },
        { status: "failed", responseTimeMs: 30, createdAt: new Date("2026-01-02") },
      ],
    })],
  ], async () => {
    const result = await getWebhookAnalytics(String(USER_ID));

    assert.equal(result[0].successes, 1);
    assert.equal(result[0].failures, 1);
    assert.equal(result[0].successRate, 50);
  });
});

test("deliverEvent supports legacy event documents and encrypted secrets", async () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  const logs = [];
  const audits = [];

  await withPatched([
    [Webhook, "find", (query) => {
      assert.deepEqual(query.$or, [{ events: "invoice.created" }, { event: "invoice.created" }]);
      return {
        select: async () => [
          {
            _id: new mongoose.Types.ObjectId(),
            userId: USER_ID,
            event: "invoice.created",
            secret: encryptWebhookSecret("delivery-secret"),
            url: "https://8.8.8.8/hook",
            save: async () => {},
          },
        ],
      };
    }],
    [WebhookLog, "create", async (payload) => {
      logs.push(payload);
      return payload;
    }],
    [AuditEvent, "create", async (payload) => {
      audits.push(payload);
      return payload;
    }],
    [WebhookRetry, "create", async (payload) => payload],
    [axios, "post", async (_url, _payload, options) => {
      assert.ok(options.headers["X-TaxBee-Signature"]);
      return { status: 200 };
    }],
  ], async () => {
    const result = await deliverEvent("invoice.created", { invoiceId: "inv_1" });

    assert.equal(result[0].status, "success");
    assert.equal(logs[0].status, "success");
    assert.equal(audits[0].eventType, "WEBHOOK_DELIVERY_SUCCESS");
  });
});
