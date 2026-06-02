import UsageMetric from "../models/UsageMetric.js";

export const trackUsage = async ({
  metric,
  value = 1,
  userId = null,
  metadata = {},
}) => {
  if (!metric) {
    throw new Error("Metric name is required");
  }

  return UsageMetric.create({
    metric,
    value,
    userId,
    metadata,
  });
};

export const getUsageSummary = async () => {
  const totals = await UsageMetric.aggregate([
    {
      $group: {
        _id: "$metric",
        total: { $sum: "$value" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        total: -1,
      },
    },
  ]);

  return totals.map((item) => ({
    metric: item._id,
    total: item.total,
    count: item.count,
  }));
};

export const getRecentUsage = async (limit = 50) => {
  return UsageMetric.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

export default {
  trackUsage,
  getUsageSummary,
  getRecentUsage,
};