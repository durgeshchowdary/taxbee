import Webhook from "../models/Webhook.js";
import WebhookLog from "../models/WebhookLog.js";

export const getWebhookAnalytics = async (userId) => {
  const webhooks = await Webhook.find({
    userId,
  }).select("+event").lean();

  const results = [];

  for (const webhook of webhooks) {
    const logs = await WebhookLog.find({
      webhookId: webhook._id,
    }).lean();

    const totalDeliveries = logs.length;

    const successes = logs.filter(
      (log) => log.status === "success"
    ).length;

    const failures = totalDeliveries - successes;

    const avgResponseTime =
      totalDeliveries > 0
        ? Math.round(
            logs.reduce(
              (sum, log) =>
                sum + (log.responseTimeMs || 0),
              0
            ) / totalDeliveries
          )
        : 0;

    results.push({
      webhookId: webhook._id,
      event: webhook.events?.[0] || webhook.event,
      events: webhook.events?.length ? webhook.events : webhook.event ? [webhook.event] : [],
      url: webhook.url,
      totalDeliveries,
      successes,
      failures,
      successRate:
        totalDeliveries > 0
          ? Number(
              (
                (successes /
                  totalDeliveries) *
                100
              ).toFixed(2)
            )
          : 0,
      avgResponseTime,
      lastDelivery:
        logs.length > 0
          ? logs.sort(
              (a, b) =>
                new Date(b.createdAt) -
                new Date(a.createdAt)
            )[0].createdAt
          : null,
    });
  }

  return results;
};
