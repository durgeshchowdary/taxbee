import crypto from "crypto";
import Razorpay from "razorpay";
import Plan from "../models/Plan.js";
import Payment from "../models/Payment.js";
import { createInvoice } from "./invoiceService.js";
import {
  activateSubscriptionAfterPayment,
  getOrCreateTrialSubscription,
} from "./billingService.js";
import { recordAuditEvent } from "./auditTrailService.js";

const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

export const createCheckoutOrder = async ({
  userId,
  planCode = "pro_monthly",
}) => {
  const plan = await Plan.findOne({ code: planCode, isActive: true });

  if (!plan) {
    throw new Error("Plan not found");
  }

  const subscription = await getOrCreateTrialSubscription({ userId });
  const receipt = `taxbee_${Date.now()}`;

  let razorpayOrder = null;
  const razorpay = getRazorpayClient();

  if (razorpay) {
    razorpayOrder = await razorpay.orders.create({
      amount: plan.priceInPaise,
      currency: plan.currency || "INR",
      receipt,
      notes: {
        userId: String(userId),
        planCode,
        subscriptionId: String(subscription._id),
      },
    });
  }

  const payment = await Payment.create({
    userId,
    subscriptionId: subscription._id,
    planCode,
    amountInPaise: plan.priceInPaise,
    currency: plan.currency || "INR",
    razorpayOrderId: razorpayOrder?.id || `dev_order_${receipt}`,
    status: "created",
  });

  await recordAuditEvent({
    userId,
    eventType: "payment_order_created",
    entityType: "Payment",
    entityId: String(payment._id),
    sourceType: "system",
    actorType: "user",
    metadata: {
      planCode,
      amountInPaise: plan.priceInPaise,
      razorpayOrderId: payment.razorpayOrderId,
    },
  });

  return {
    payment,
    order: {
      id: payment.razorpayOrderId,
      amount: payment.amountInPaise,
      currency: payment.currency,
      planCode,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || "rzp_test_missing_key",
      devMode: !razorpay,
    },
  };
};

export const verifyRazorpayPayment = async ({
  userId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  const payment = await Payment.findOne({
    userId,
    razorpayOrderId,
    status: "created",
  });

  if (!payment) {
    throw new Error("Payment order not found");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "dev_secret")
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const isDevMode =
    !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;

  if (!isDevMode && expectedSignature !== razorpaySignature) {
    throw new Error("Invalid payment signature");
  }

  payment.status = "paid";
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.paidAt = new Date();
  await payment.save();

  const subscription = await activateSubscriptionAfterPayment({
    userId,
    planId: null,
    provider: "razorpay",
    providerSubscriptionId: razorpayPaymentId,
    months: 1,
  });

  const invoice = await createInvoice({
    userId,
    subscriptionId: subscription._id,
    paymentId: payment._id,
    planCode: payment.planCode,
    amountInPaise: payment.amountInPaise,
  });

  await recordAuditEvent({
    userId,
    eventType: "payment_verified_subscription_activated",
    entityType: "Payment",
    entityId: String(payment._id),
    sourceType: "system",
    actorType: "system",
    metadata: {
      razorpayOrderId,
      razorpayPaymentId,
      subscriptionId: String(subscription._id),
      invoiceId: String(invoice._id),
      invoiceNumber: invoice.invoiceNumber,
    },
  });

  return {
    payment,
    subscription,
    invoice,
  };
};