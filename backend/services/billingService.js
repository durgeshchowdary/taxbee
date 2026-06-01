import Plan from "../models/Plan.js";
import Subscription from "../models/Subscription.js";
import Invoice from "../models/Invoice.js";
import { recordAuditEvent } from "./auditTrailService.js";

export const TRIAL_DAYS = 15;
export const PAYMENT_REQUIRED_DAY = 15;
export const DEACTIVATION_DAY = 21;

export const calculateTrialEnd = (start = new Date()) => {
  const end = new Date(start);
  end.setDate(end.getDate() + TRIAL_DAYS);
  return end;
};

export const getTrialDay = (subscription, now = new Date()) => {
  const startedAt = new Date(subscription.trialStartedAt);
  const diffMs = now.getTime() - startedAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

export const getSubscriptionAccess = (subscription, now = new Date()) => {
  if (!subscription) {
    return {
      canLogin: true,
      canUseFeatures: false,
      paymentOnly: true,
      reason: "NO_SUBSCRIPTION",
    };
  }

  if (subscription.status === "active") {
    return {
      canLogin: true,
      canUseFeatures: true,
      paymentOnly: false,
      reason: "ACTIVE",
    };
  }

  if (
    subscription.status === "trialing" &&
    subscription.trialEndsAt &&
    new Date(subscription.trialEndsAt) > now
  ) {
    return {
      canLogin: true,
      canUseFeatures: true,
      paymentOnly: false,
      reason: "TRIAL_ACTIVE",
    };
  }

  if (subscription.status === "payment_required") {
    return {
      canLogin: true,
      canUseFeatures: false,
      paymentOnly: true,
      reason: "PAYMENT_REQUIRED",
    };
  }

  if (subscription.status === "deactivated") {
    return {
      canLogin: true,
      canUseFeatures: false,
      paymentOnly: true,
      reason: "ACCOUNT_DEACTIVATED_PAYMENT_REQUIRED",
    };
  }

  return {
    canLogin: true,
    canUseFeatures: false,
    paymentOnly: true,
    reason: "SUBSCRIPTION_INACTIVE",
  };
};

export const getOrCreateTrialSubscription = async ({ userId }) => {
  let subscription = await Subscription.findOne({ userId });

  if (subscription) return subscription;

  const now = new Date();

  subscription = await Subscription.create({
    userId,
    status: "trialing",
    isTrial: true,
    trialStartedAt: now,
    trialEndsAt: calculateTrialEnd(now),
    autoRenew: false,
  });

  await recordAuditEvent({
    userId,
    eventType: "subscription_trial_started",
    entityType: "Subscription",
    entityId: String(subscription._id),
    sourceType: "system",
    actorType: "user",
    metadata: {
      trialDays: TRIAL_DAYS,
      trialEndsAt: subscription.trialEndsAt,
    },
  });

  return subscription;
};

export const updateSubscriptionLifecycle = async ({
  subscription,
  now = new Date(),
}) => {
  if (!subscription || subscription.status === "active") return subscription;

  const trialDay = getTrialDay(subscription, now);

  if (trialDay >= DEACTIVATION_DAY && subscription.status !== "deactivated") {
    subscription.status = "deactivated";
    subscription.deactivatedAt = now;
    await subscription.save();
    return subscription;
  }

  if (
    trialDay >= PAYMENT_REQUIRED_DAY &&
    subscription.status === "trialing"
  ) {
    subscription.status = "payment_required";
    subscription.paymentRequiredAt = now;
    await subscription.save();
    return subscription;
  }

  return subscription;
};

export const activateSubscriptionAfterPayment = async ({
  userId,
  planId = null,
  provider = "razorpay",
  providerSubscriptionId = "",
  months = 1,
}) => {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + months);

  const subscription = await Subscription.findOneAndUpdate(
    { userId },
    {
      $set: {
        planId,
        status: "active",
        isTrial: false,
        activatedAt: now,
        expiresAt,
        autoRenew: true,
        provider,
        providerSubscriptionId,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  await recordAuditEvent({
    userId,
    eventType: "subscription_activated_after_payment",
    entityType: "Subscription",
    entityId: String(subscription._id),
    sourceType: "system",
    actorType: "system",
    metadata: {
      planId,
      provider,
      providerSubscriptionId,
      expiresAt,
    },
  });

  return subscription;
};

export const generateInvoiceNumber = () =>
  `TXB-${new Date().getFullYear()}-${Date.now()}`;

export const generateInvoice = async ({
  userId,
  subscriptionId = null,
  amountInPaise,
  taxAmountInPaise = 0,
  paymentProvider = "none",
  providerReference = "",
  lineItems = [],
}) => {
  const totalAmountInPaise = amountInPaise + taxAmountInPaise;

  const invoice = await Invoice.create({
    userId,
    subscriptionId,
    invoiceNumber: generateInvoiceNumber(),
    amountInPaise,
    taxAmountInPaise,
    totalAmountInPaise,
    status: "pending",
    paymentProvider,
    providerReference,
    lineItems,
  });

  await recordAuditEvent({
    userId,
    eventType: "invoice_generated",
    entityType: "Invoice",
    entityId: String(invoice._id),
    sourceType: "system",
    actorType: "system",
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      totalAmountInPaise,
    },
  });

  return invoice;
};

export const getBillingDashboard = async ({ userId }) => {
  const subscription = await Subscription.findOne({ userId }).lean();
  const invoices = await Invoice.find({ userId })
    .sort({ issuedAt: -1 })
    .limit(20)
    .lean();

  const access = getSubscriptionAccess(subscription);

  return {
    subscription,
    access,
    invoices,
  };
};

export const seedDefaultPlans = async () => {
  const plans = [
    {
      code: "free_trial",
      name: "Free Trial",
      description: "15-day free TaxBee trial",
      priceInPaise: 0,
      billingCycle: "trial",
      trialDays: 15,
      features: ["OCR", "AI Extraction", "Tax Intelligence", "Bee Assistant"],
      limits: {
        maxDocuments: 10,
        maxReviewers: 0,
        maxStorageGB: 1,
        maxAiRequests: 50,
        maxOcrPages: 100,
      },
    },
    {
      code: "pro_monthly",
      name: "Pro Monthly",
      description: "Monthly plan for individual taxpayers",
      priceInPaise: 99900,
      billingCycle: "monthly",
      features: ["Unlimited Drafts", "AI Extraction", "Bee Assistant"],
      limits: {
        maxDocuments: 100,
        maxReviewers: 1,
        maxStorageGB: 5,
        maxAiRequests: 500,
        maxOcrPages: 1000,
      },
    },
    {
      code: "ca_assisted",
      name: "CA Assisted",
      description: "Assisted tax filing with reviewer collaboration",
      priceInPaise: 249900,
      billingCycle: "custom",
      features: ["Reviewer Collaboration", "Priority Support", "Audit Trail"],
      limits: {
        maxDocuments: 300,
        maxReviewers: 3,
        maxStorageGB: 15,
        maxAiRequests: 1500,
        maxOcrPages: 3000,
      },
    },
  ];

  await Promise.all(
    plans.map((plan) =>
      Plan.findOneAndUpdate(
        { code: plan.code },
        { $set: plan },
        { upsert: true, new: true }
      )
    )
  );

  return Plan.find({}).sort({ priceInPaise: 1 }).lean();
};