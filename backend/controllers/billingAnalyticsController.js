import Payment from "../models/Payment.js";
import Subscription from "../models/Subscription.js";
import Invoice from "../models/Invoice.js";

export const getRevenueDashboard = async (req, res) => {
  try {
    const [
      totalRevenue,
      activeSubscribers,
      invoices,
      paymentRequired,
      deactivated,
      trials,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: null,
            total: { $sum: "$amountInPaise" },
          },
        },
      ]),

      Subscription.countDocuments({
        status: "active",
      }),

      Invoice.countDocuments(),

      Subscription.countDocuments({
        status: "payment_required",
      }),

      Subscription.countDocuments({
        status: "deactivated",
      }),

      Subscription.countDocuments({
status: "trialing",      }),
    ]);

    return res.json({
      success: true,
      data: {
        totalRevenueInr:
          (totalRevenue?.[0]?.total || 0) / 100,

        activeSubscribers,
        invoicesGenerated: invoices,
        paymentRequiredUsers: paymentRequired,
        deactivatedUsers: deactivated,
        trialUsers: trials,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};