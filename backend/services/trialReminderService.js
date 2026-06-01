import Subscription from "../models/Subscription.js";

export const getTrialDay = (subscription, now = new Date()) => {
  const startedAt = new Date(subscription.trialStartedAt);
  const diffMs = now.getTime() - startedAt.getTime();

  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

export const processTrialReminders = async () => {
  const subscriptions = await Subscription.find({
    status: {
      $in: ["trialing", "payment_required"],
    },
  });

  for (const subscription of subscriptions) {
    const day = getTrialDay(subscription);

    console.log(
      `[TRIAL CHECK] User=${subscription.userId} Day=${day}`
    );

    if (day === 11 && !subscription.reminders?.day11SentAt) {
      console.log("SEND DAY 11 EMAIL");
    }

    if (day === 12 && !subscription.reminders?.day12SentAt) {
      console.log("SEND DAY 12 EMAIL");
    }

    if (day === 13 && !subscription.reminders?.day13SentAt) {
      console.log("SEND DAY 13 EMAIL");
    }

    if (day === 14 && !subscription.reminders?.day14SentAt) {
      console.log("SEND DAY 14 FINAL EMAIL");
    }

    if (day >= 15 && subscription.status === "trialing") {
      subscription.status = "payment_required";
      subscription.paymentRequiredAt = new Date();

      await subscription.save();

      console.log("PAYMENT REQUIRED");
    }

    if (day >= 21 && subscription.status !== "deactivated") {
      subscription.status = "deactivated";
      subscription.deactivatedAt = new Date();

      await subscription.save();

      console.log("ACCOUNT DEACTIVATED");
    }
  }

  return true;
};