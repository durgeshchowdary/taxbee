import {
  getWebhookAnalytics,
} from "../services/webhookAnalyticsService.js";

export const getAnalytics = async (
  req,
  res
) => {
  try {
    const analytics =
      await getWebhookAnalytics(
        req.user?.id ||
          req.user?._id
      );

    return res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};