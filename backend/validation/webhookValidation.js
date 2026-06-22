import dns from "dns/promises";
import net from "net";
import { z } from "zod";

const WEBHOOK_EVENT_PATTERN = /^[a-z][a-z0-9._:-]{1,80}$/i;

const webhookEventSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(WEBHOOK_EVENT_PATTERN, "Webhook event contains unsupported characters");

const payloadSchema = z.record(z.string(), z.unknown()).default({});

export const createWebhookSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    url: z.string().trim().url().max(2048),
    event: webhookEventSchema.optional(),
    events: z.array(webhookEventSchema).min(1).max(25).optional(),
  })
  .refine((value) => value.event || value.events?.length, {
    message: "At least one webhook event is required",
    path: ["events"],
  });

export const updateWebhookSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    url: z.string().trim().url().max(2048).optional(),
    event: webhookEventSchema.optional(),
    events: z.array(webhookEventSchema).min(1).max(25).optional(),
    status: z.enum(["active", "disabled"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one webhook field is required",
  });

export const testWebhookSchema = z.object({
  event: webhookEventSchema,
  payload: payloadSchema,
});

export const normalizeWebhookEvents = (payload = {}) => {
  const events = Array.isArray(payload.events) ? payload.events : payload.event ? [payload.event] : [];
  return [...new Set(events.map((event) => String(event).trim()).filter(Boolean))];
};

export const validateWebhookPayload = (schema, payload) => {
  const result = schema.safeParse(payload || {});
  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join("; ");
    const error = new Error(message || "Invalid webhook payload");
    error.status = 400;
    error.code = "WEBHOOK_VALIDATION_ERROR";
    throw error;
  }
  return {
    ...result.data,
    events: normalizeWebhookEvents(result.data),
  };
};

const isPrivateIpv4 = (ip) => {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
};

const isPrivateIpv6 = (ip) => {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
};

export const isPrivateAddress = (address) => {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return false;
};

const rejectUnsafeUrl = (message) => {
  const error = new Error(message);
  error.status = 400;
  error.code = "WEBHOOK_UNSAFE_URL";
  throw error;
};

export const assertSafeWebhookUrl = async (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    rejectUnsafeUrl("Webhook URL must be a valid URL");
  }

  if (!["https:", "http:"].includes(url.protocol)) {
    rejectUnsafeUrl("Webhook URL must use HTTP or HTTPS");
  }

  if (url.username || url.password) {
    rejectUnsafeUrl("Webhook URL credentials are not allowed");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "metadata.google.internal"
  ) {
    rejectUnsafeUrl("Webhook URL points to a restricted host");
  }

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) rejectUnsafeUrl("Webhook URL points to a private network");
    return url.toString();
  }

  if (process.env.WEBHOOK_SSRF_DNS_LOOKUP === "false") {
    return url.toString();
  }

  let records;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    rejectUnsafeUrl("Webhook URL host could not be resolved safely");
  }

  if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
    rejectUnsafeUrl("Webhook URL resolves to a restricted network");
  }

  return url.toString();
};
