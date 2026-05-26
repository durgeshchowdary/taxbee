import Notification from "../models/Notification.js";
import { enqueueJob } from "./jobQueueService.js";
import { sendEmailMessage } from "./emailService.js";
import { sanitizePlainObject } from "../utils/mongoSafety.js";
import { logger } from "../utils/safeLogger.js";

const DEDUPE_WINDOW_MS = 15 * 60 * 1000;

const emailSubjects = {
  email_verification: "Verify your TaxBee login",
  reviewer_invite: "You have been invited to review a TaxBee workspace",
  reviewer_comment: "New reviewer comment in TaxBee",
  import_job_completed: "TaxBee document import completed",
  import_job_failed: "TaxBee document import needs attention",
  filing_readiness_reminder: "TaxBee filing readiness reminder",
  security_alert: "TaxBee security alert",
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const safeMessage = ({ title, message }) => `${title}\n\n${message}\n\nOpen TaxBee to review details.`;

const recentDedupeMatch = async ({ userId, recipientEmail, type, dedupeKey }) => {
  if (!dedupeKey) return null;
  return Notification.findOne({
    type,
    dedupeKey,
    ...(userId ? { userId } : { recipientEmail }),
    createdAt: { $gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
  }).lean();
};

export const serializeNotification = (notification) => ({
  id: String(notification._id),
  type: notification.type,
  title: notification.title,
  message: notification.message,
  status: notification.status,
  emailStatus: notification.emailStatus,
  createdAt: notification.createdAt?.toISOString?.() || notification.createdAt,
  readAt: notification.readAt?.toISOString?.() || notification.readAt,
  metadata: notification.metadata || {},
});

export const createNotification = async ({
  userId = null,
  recipientEmail,
  type,
  title,
  message,
  metadata = {},
  sendEmail = true,
  dedupeKey = "",
  priority = 0,
}) => {
  const email = normalizeEmail(recipientEmail);
  if (!email) return null;

  try {
    const existing = await recentDedupeMatch({ userId, recipientEmail: email, type, dedupeKey });
    if (existing) return existing;

    const notification = await Notification.create({
      userId,
      recipientEmail: email,
      type,
      title,
      message,
      metadata: sanitizePlainObject(metadata),
      dedupeKey,
      emailStatus: sendEmail ? "queued" : "not_queued",
      emailQueuedAt: sendEmail ? new Date() : null,
    });

    if (sendEmail) {
      await enqueueJob({
        type: "email_send",
        userId: userId || metadata.actorUserId || metadata.ownerUserId,
        inputRef: { notificationId: String(notification._id), type },
        payload: {
          notificationId: String(notification._id),
          to: email,
          subject: emailSubjects[type] || title,
          text: safeMessage({ title, message }),
        },
        priority,
        maxAttempts: 3,
      });
    }

    logger.info("notification_created", {
      notificationId: String(notification._id),
      userId: userId ? String(userId) : null,
      type,
      emailQueued: sendEmail,
    });

    return notification;
  } catch (error) {
    logger.error("notification_create_failed", error, {
      userId: userId ? String(userId) : null,
      type,
    });
    return null;
  }
};

export const sendEmailJob = async (payload = {}) => {
  const notification = payload.notificationId
    ? await Notification.findById(payload.notificationId)
    : null;

  try {
    const result = await sendEmailMessage({
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    });

    if (notification) {
      notification.emailStatus = result.skipped ? "skipped" : "sent";
      notification.emailSentAt = result.skipped ? null : new Date();
      notification.emailFailureReason = "";
      await notification.save();
    }

    return {
      notificationId: payload.notificationId,
      emailStatus: result.skipped ? "skipped" : "sent",
      provider: result.provider,
    };
  } catch (error) {
    if (notification) {
      notification.emailStatus = "failed";
      notification.emailFailureReason = String(error?.message || "Email failed").slice(0, 500);
      await notification.save();
    }
    throw error;
  }
};
