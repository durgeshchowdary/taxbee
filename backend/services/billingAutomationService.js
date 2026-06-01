import Subscription from "../models/Subscription.js";
import { createNotification } from "./notificationService.js";

export const processSubscriptionLifecycle = async () => {
  const now = new Date();

  const subscriptions = await Subscription.find({
    status: {
      $in: ["trialing", "payment_required", "active"],
    },
  });

  let processed = 0;

  for (const sub of subscriptions) {
    processed++;

    const trialEnd = new Date(sub.trialEndsAt || sub.endsAt);
    const daysRemaining = Math.ceil(
      (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Day 11-14 reminders
    if (
      sub.status === "trialing" &&
      daysRemaining >= 1 &&
      daysRemaining <= 4
    ) {
      await createNotification({
        userId: sub.userId,
        type: "billing_reminder",
        title: "Your TaxBee trial is ending soon",
        message: `Your trial expires in ${daysRemaining} day(s). Upgrade to continue using TaxBee.`,
      });
    }

    // Day 15 lock
    if (
      sub.status === "trialing" &&
      trialEnd <= now
    ) {
      sub.status = "payment_required";
      await sub.save();
    }

    // Day 20 deactivate
    if (
      sub.status === "payment_required"
    ) {
      const overdueDays = Math.floor(
        (now.getTime() - trialEnd.getTime()) /
        (1000 * 60 * 60 * 24)
      );

      if (overdueDays >= 5) {
        sub.status = "deactivated";
        await sub.save();
      }
    }
  }

  return {
    processed,
  };
};