import crypto from "crypto";
import Webhook from "../models/Webhook.js";
import { deliverEvent } from "./webhookDeliveryService.js";
import { recordAuditEvent } from "./auditTrailService.js";
import { decryptWebhookSecret } from "./webhookSignatureService.js";
import {
  assertSafeWebhookUrl,
  createWebhookSchema,
  normalizeWebhookEvents,
  updateWebhookSchema,
  validateWebhookPayload,
} from "../validation/webhookValidation.js";

const serializeWebhook = (webhook, { revealSecret = false, plainSecret = "" } = {}) => {
  const source = webhook?.toObject ? webhook.toObject() : webhook;
  const events = normalizeWebhookEvents(source);

  return {
    ...source,
    id: source._id?.toString?.() || source.id,
    events,
    event: events[0] || source.event,
    secret: revealSecret ? plainSecret || decryptWebhookSecret(source.secret) : undefined,
    hasSecret: Boolean(source.secret || plainSecret),
  };
};

export const createWebhook = async (
  userId,
  payload
) => {
  const validated = validateWebhookPayload(createWebhookSchema, payload);
  const safeUrl = await assertSafeWebhookUrl(validated.url);
  const secret =
    crypto.randomBytes(32).toString("hex");

  const webhook = await Webhook.create({
    userId,
    name: validated.name,
    url: safeUrl,
    events: validated.events,
    secret,
  });

  await recordAuditEvent({
    userId,
    eventType: "WEBHOOK_CREATED",
    entityType: "Webhook",
    entityId: webhook._id,
    newValue: validated.events.join(","),
    sourceType: "system",
    actorType: "user",
    metadata: {
      webhookId: String(webhook._id),
      events: validated.events,
      url: safeUrl,
    },
  });

  return serializeWebhook(webhook, { revealSecret: true, plainSecret: secret });
};

export const getWebhooks = async (
  userId
) => {
  const webhooks = await Webhook.find({
    userId,
  })
    .select("+event +secret")
    .sort({ createdAt: -1 })
    .lean();

  return webhooks.map((webhook) => serializeWebhook(webhook));
};

export const disableWebhook = async (
  id,
  userId
) => {
  const webhook = await Webhook.findOneAndUpdate(
    {
      _id: id,
      userId,
    },
    {
      status: "disabled",
    },
    {
      new: true,
    }
  ).select("+event +secret");

  if (webhook) {
    await recordAuditEvent({
      userId,
      eventType: "WEBHOOK_DISABLED",
      entityType: "Webhook",
      entityId: webhook._id,
      oldValue: "active",
      newValue: "disabled",
      sourceType: "system",
      actorType: "user",
      metadata: { webhookId: String(webhook._id) },
    });
  }

  return webhook ? serializeWebhook(webhook) : null;
};

export const updateWebhook = async (
  id,
  userId,
  payload
) => {
  const validated = validateWebhookPayload(updateWebhookSchema, payload);
  const update = {};

  if (validated.name) update.name = validated.name;
  if (validated.events?.length) update.events = validated.events;
  if (validated.status) update.status = validated.status;
  if (validated.url) update.url = await assertSafeWebhookUrl(validated.url);

  const webhook = await Webhook.findOneAndUpdate(
    { _id: id, userId },
    { $set: update, $unset: { event: "" } },
    { new: true }
  ).select("+event +secret");

  if (webhook) {
    await recordAuditEvent({
      userId,
      eventType: "WEBHOOK_UPDATED",
      entityType: "Webhook",
      entityId: webhook._id,
      newValue: update,
      sourceType: "system",
      actorType: "user",
      metadata: { webhookId: String(webhook._id), changedFields: Object.keys(update) },
    });
  }

  return webhook ? serializeWebhook(webhook) : null;
};

export const triggerWebhook = async (
  event,
  data,
  { userId = null } = {}
) => {
  const results = await deliverEvent(
    event,
    data,
    { actorUserId: userId }
  );

  if (userId) {
    await recordAuditEvent({
      userId,
      eventType: "WEBHOOK_TEST_SENT",
      entityType: "Webhook",
      newValue: event,
      sourceType: "system",
      actorType: "user",
      metadata: { event, deliveries: results.length },
    });
  }

  return results;
};

export default {
  createWebhook,
  getWebhooks,
  disableWebhook,
  updateWebhook,
  triggerWebhook,
};
