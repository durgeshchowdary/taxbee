import {
  getOrCreateTrialSubscription,
  updateSubscriptionLifecycle,
  getBillingDashboard,
  seedDefaultPlans,
} from "../services/billingService.js";
import Plan from "../models/Plan.js";

const getUserId = (req) => req.user?._id || req.user?.id;

export const getPlans = async (_req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true })
      .sort({ priceInPaise: 1 })
      .lean();

    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

export const seedPlans = async (_req, res, next) => {
  try {
    const plans = await seedDefaultPlans();

    return res.json({
      success: true,
      message: "Default plans seeded",
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyBilling = async (req, res, next) => {
  try {
    const userId = getUserId(req);

    let subscription = await getOrCreateTrialSubscription({ userId });
    subscription = await updateSubscriptionLifecycle({ subscription });

    const dashboard = await getBillingDashboard({ userId });

    return res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};