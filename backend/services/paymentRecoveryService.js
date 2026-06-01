import PaymentFailure from "../models/PaymentFailure.js";
import Payment from "../models/Payment.js";
import Subscription from "../models/Subscription.js";

export const recordPaymentFailure = async ({
  userId,
  paymentId,
  reason,
}) => {
  const failure = await PaymentFailure.create({
    userId,
    paymentId,
    reason,
  });

  return failure;
};

export const getUnrecoveredFailures = async ({
  userId,
}) => {
  return PaymentFailure.find({
    userId,
    recovered: false,
  })
    .sort({ createdAt: -1 })
    .lean();
};

export const markFailureRecovered = async ({
  failureId,
}) => {
  const failure = await PaymentFailure.findById(failureId);

  if (!failure) {
    throw new Error("Payment failure not found");
  }

  failure.recovered = true;

  await failure.save();

  return failure;
};

export const handleFailedPayment = async ({
  userId,
  paymentId,
  reason,
}) => {
  const failure = await recordPaymentFailure({
    userId,
    paymentId,
    reason,
  });

  await Payment.findByIdAndUpdate(paymentId, {
    status: "failed",
  });

  await Subscription.updateMany(
    {
      userId,
      status: {
        $in: ["active", "trial"],
      },
    },
    {
      status: "payment_required",
    }
  );

  return failure;
};