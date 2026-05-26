import nodemailer from "nodemailer";
import { logger } from "../utils/safeLogger.js";

const fromAddress = () => process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@taxbee.local";

const hasSmtpConfig = () =>
  Boolean(process.env.SMTP_HOST || (process.env.EMAIL_USER && process.env.EMAIL_PASS));

const createTransport = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendEmailMessage = async ({ to, subject, text }) => {
  if (!to || !subject || !text) {
    const error = new Error("Email recipient, subject, and text are required");
    error.status = 400;
    throw error;
  }

  if (!hasSmtpConfig()) {
    logger.warn("email_skipped_no_provider", { toDomain: String(to).split("@")[1] || "", subject });
    return { skipped: true, provider: "none" };
  }

  const transporter = createTransport();
  const result = await transporter.sendMail({
    from: `"TaxBee" <${fromAddress()}>`,
    to,
    subject,
    text,
  });

  logger.info("email_sent", {
    toDomain: String(to).split("@")[1] || "",
    messageId: result.messageId,
  });

  return { skipped: false, provider: process.env.SMTP_HOST ? "smtp" : process.env.EMAIL_SERVICE || "gmail" };
};
