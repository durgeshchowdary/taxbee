import crypto from "crypto";
import PaymentEvent from "../models/PaymentEvent.js";
import Payment from "../models/Payment.js";

export const verifyWebhookSignature = ({
  payload,
  signature,
  secret,
}) => {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return expected === signature;
};

export const processWebhookEvent = async ({
  eventId,
  eventType,
  payload,
}) => {
  const existing = await PaymentEvent.findOne({
    eventId,
  });

  if (existing) {
    return {
      duplicate: true,
      event: existing,
    };
  }

  const paymentEvent = await PaymentEvent.create({
    eventId,
    eventType,
    payload,
    status: "received",
  });

  try {
    if (eventType === "payment.captured") {
      const razorpayPaymentId =
        payload?.payload?.payment?.entity?.id;

      await Payment.findOneAndUpdate(
        {
          razorpayPaymentId,
        },
        {
          status: "paid",
          paidAt: new Date(),
        }
      );
    }

    paymentEvent.status = "processed";
    paymentEvent.processedAt = new Date();

    await paymentEvent.save();

    return {
      success: true,
      event: paymentEvent,
    };
  } catch (error) {
    paymentEvent.status = "failed";
    paymentEvent.failureReason = error.message;

    await paymentEvent.save();

    throw error;
  }
};