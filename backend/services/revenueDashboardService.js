import Payment from "../models/Payment.js";
import Subscription from "../models/Subscription.js";
import Invoice from "../models/Invoice.js";

export const getRevenueDashboard = async () => {
  const [
    revenue,
    active,
    renewalPending,
    paymentRequired,
    deactivated,
    invoices,
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

    Subscription.countDocuments({
      status: "renewal_pending",
    }),

    Subscription.countDocuments({
      status: "payment_required",
    }),

    Subscription.countDocuments({
      status: "deactivated",
    }),

    Invoice.countDocuments(),
  ]);

  return {
    totalRevenueInr:
      (revenue?.[0]?.total || 0) / 100,

    activeSubscribers: active,
    renewalPendingSubscribers:
      renewalPending,

    paymentRequiredSubscribers:
      paymentRequired,

    deactivatedSubscribers:
      deactivated,

    invoicesGenerated:
      invoices,
  };
};