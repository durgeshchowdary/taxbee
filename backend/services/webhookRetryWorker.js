import WebhookRetry from "../models/WebhookRetry.js";

export const processWebhookRetries = async () => {
  const retries = await WebhookRetry.find({
    status: "pending",
    nextRetryAt: {
      $lte: new Date(),
    },
  });

  console.log(
    `[WEBHOOK RETRIES] Processing ${retries.length} retries`
  );

  return retries.length;
};