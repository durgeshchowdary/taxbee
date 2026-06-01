import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";
import Payment from "../models/Payment.js";
import { createInvoice } from "./invoiceService.js";
import { buildReceiptEmail } from "./emailReceiptService.js";

const addMonths = (date, months = 1) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

export const createRenewalPayment = async ({
  subscription,
  planCode = "pro_monthly",
}) => {
  const plan = await Plan.findOne({
    code: planCode,
    isActive: true,
  });

  if (!plan) {
    throw new Error("Plan not found");
  }

  const payment = await Payment.create({
    userId: subscription.userId,
    subscriptionId: subscription._id,
    planCode: plan.code,
    amountInPaise: plan.priceInPaise,
    currency: plan.currency || "INR",
    razorpayOrderId: `renewal_${Date.now()}`,
    status: "created",
  });

  return payment;
};

export const completeRenewal = async ({
  subscriptionId,
  paymentId,
}) => {
  const subscription = await Subscription.findById(subscriptionId);

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new Error("Payment not found");
  }

  payment.status = "paid";
  payment.paidAt = new Date();
  await payment.save();

  subscription.status = "active";
  subscription.currentPeriodStart = new Date();
  subscription.currentPeriodEnd = addMonths(new Date(), 1);
  subscription.endsAt = subscription.currentPeriodEnd;

  await subscription.save();

  const invoice = await createInvoice({
    userId: subscription.userId,
    subscriptionId: subscription._id,
    paymentId: payment._id,
    planCode: payment.planCode,
    amountInPaise: payment.amountInPaise,
  });

  const receipt = buildReceiptEmail({
    invoiceNumber: invoice.invoiceNumber,
    planName: payment.planCode,
    amountInPaise: payment.amountInPaise,
  });

  return {
    subscription,
    payment,
    invoice,
    receipt,
  };
};

export const createRenewalForSubscription = async ({
  subscriptionId,
  planCode = "pro_monthly",
}) => {
  const subscription = await Subscription.findById(subscriptionId);

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  subscription.status = "renewal_pending";
  await subscription.save();

  const payment = await createRenewalPayment({
    subscription,
    planCode,
  });

  return {
    subscription,
    payment,
  };
};