import Subscription from "../models/Subscription.js";

export const requireActiveSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const subscription = await Subscription.findOne({ userId });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        code: "NO_SUBSCRIPTION",
        message: "Subscription required",
      });
    }

    if (
      subscription.status === "payment_required" ||
      subscription.status === "deactivated"
    ) {
      return res.status(403).json({
        success: false,
        code: "PAYMENT_REQUIRED",
        message: "Please complete payment to continue",
        billingOnly: true,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};