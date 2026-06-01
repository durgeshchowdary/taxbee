import Subscription from "../models/Subscription.js";

export const getRenewalCandidates = async () => {
  const now = new Date();

  return Subscription.find({
    status: "active",
    currentPeriodEnd: {
      $lte: now,
    },
  });
};

export const markForRenewal = async (
  subscriptionId
) => {
  const subscription =
    await Subscription.findById(subscriptionId);

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  subscription.status = "renewal_pending";

  await subscription.save();

  return subscription;
};

export const processRenewalCandidates =
  async () => {
    const candidates =
      await getRenewalCandidates();

    const results = [];

    for (const subscription of candidates) {
      const updated =
        await markForRenewal(
          subscription._id
        );

      results.push(updated);
    }

    return results;
  };