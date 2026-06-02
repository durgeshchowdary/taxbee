import {
  trackUsage,
  getUsageSummary,
  getRecentUsage,
} from "../services/usageAnalyticsService.js";

export const createUsageMetric = async (req, res) => {
  try {
    const metric = await trackUsage({
      metric: req.body.metric,
      value: req.body.value || 1,
      userId: req.user?.id || req.user?._id || null,
      metadata: req.body.metadata || {},
    });

    return res.status(201).json({
      success: true,
      data: metric,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUsageAnalyticsSummary = async (req, res) => {
  try {
    const summary = await getUsageSummary();

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUsageAnalyticsRecent = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);

    const recent = await getRecentUsage(limit);

    return res.json({
      success: true,
      data: recent,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};