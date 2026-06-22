import WebhookRetry from "../models/WebhookRetry.js";

export const createWebhookRetry = async ({
  webhookId,
  event,
  payload,
  error,
}) => {
  return WebhookRetry.create({
    webhookId,
    event,
    payload,
    attempts: 0,
    nextRetryAt: new Date(Date.now() + 60 * 1000),
    lastError: error?.message || "Unknown error",
  });
};