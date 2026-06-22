import axios from "axios";

import Webhook from "../models/Webhook.js";
import WebhookLog from "../models/WebhookLog.js";

import {
  decryptWebhookSecret,
  generateWebhookSignature,
} from "./webhookSignatureService.js";
import { recordAuditEvent } from "./auditTrailService.js";
import { createWebhookRetry } from "./webhookRetryService.js";

export const deliverEvent = async (
  event,
  payload,
  { actorUserId = null } = {}
) => {
  const webhooks =
    await Webhook.find({
      $or: [
        { events: event },
        { event },
      ],
      status: "active",
    }).select("+secret +event");

  const results = [];

  for (const webhook of webhooks) {
    try {
      const signature =
        generateWebhookSignature(
          payload,
          decryptWebhookSecret(webhook.secret)
        );

      const response =
        await axios.post(
          webhook.url,
          payload,
          {
            headers: {
              "Content-Type":
                "application/json",

              "X-TaxBee-Event":
                event,

              "X-TaxBee-Signature":
                signature,
            },

            timeout: 10000,
          }
        );

      await WebhookLog.create({
        webhookId: webhook._id,
        event,
        status: "success",
        responseCode:
          response.status,
      });

      webhook.lastTriggeredAt =
        new Date();

      await webhook.save();

      await recordAuditEvent({
        userId: webhook.userId || actorUserId,
        eventType: "WEBHOOK_DELIVERY_SUCCESS",
        entityType: "Webhook",
        entityId: webhook._id,
        newValue: event,
        sourceType: "system",
        actorType: "system",
        metadata: {
          webhookId: String(webhook._id),
          event,
          responseCode: response.status,
        },
      });

      results.push({
        webhookId:
          webhook._id.toString(),
        status: "success",
      });
    } catch (error) {
      await WebhookLog.create({
        webhookId: webhook._id,
        event,
        status: "failed",
        responseCode:
          error.response?.status ||
          null,
        errorMessage:
          error.message,
      });

      await createWebhookRetry({
        webhookId: webhook._id,
        event,
        payload,
        error,
      }).catch(() => null);

      await recordAuditEvent({
        userId: webhook.userId || actorUserId,
        eventType: "WEBHOOK_DELIVERY_FAILED",
        entityType: "Webhook",
        entityId: webhook._id,
        newValue: event,
        sourceType: "system",
        actorType: "system",
        metadata: {
          webhookId: String(webhook._id),
          event,
          responseCode: error.response?.status || null,
          error: error.message,
        },
      });

      results.push({
        webhookId:
          webhook._id.toString(),
        status: "failed",
        error:
          error.message,
      });
    }
  }

  return results;
};

export default {
  deliverEvent,
};
