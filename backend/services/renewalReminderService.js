import Subscription from "../models/Subscription.js";

export const getUpcomingRenewals = async (
  days = 7
) => {
  const target = new Date();

  target.setDate(target.getDate() + days);

  return Subscription.find({
    status: "active",
    currentPeriodEnd: {
      $lte: target,
    },
  });
};

export const buildRenewalReminder = ({
  daysRemaining,
}) => {
  return {
    subject: "TaxBee Subscription Renewal Reminder",
    html: `
      <h2>Subscription Renewal Reminder</h2>
      <p>Your subscription renews in ${daysRemaining} day(s).</p>
      <p>Please ensure your payment method is ready.</p>
    `,
  };
};