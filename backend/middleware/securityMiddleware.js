import crypto from "crypto";
import { fail } from "../utils/apiResponse.js";
import { logger } from "../utils/safeLogger.js";
import { recordAuditEvent } from "../services/auditTrailService.js";

const buckets = new Map();

const getClientIp = (req) => {
  const headers = req.headers || {};
  const forwardedFor = String(headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwardedFor || req.ip || "unknown";
};

const getClientKey = (req, name) => {
  const userId = req.user?.id || req.user?._id;
  const ip = getClientIp(req);
  return `${name}:${userId || ip}`;
};

const isDevelopment = () =>
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
const setRateHeaders = (res, { max, remaining, resetAt }) => {
  res.setHeader("RateLimit-Limit", String(max));
  res.setHeader("RateLimit-Remaining", String(Math.max(remaining, 0)));
  res.setHeader("RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
};

const isPrivilegedUser = (req) => ["admin", "internal"].includes(String(req.user?.role || "").toLowerCase());

const logRateLimitSkip = (req, name, reason) => {
  logger.info("rate_limit_skipped_reason", {
    requestId: req.requestId,
    limitType: name,
    reason,
    path: req.originalUrl?.split("?")[0],
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || null,
  });
};

export const rateLimit = ({
  name,
  windowMs,
  max,
  skipInDevelopment = false,
  skipPrivileged = false,
}) => {
  return (req, res, next) => {
    if (skipInDevelopment && isDevelopment()) {
      logRateLimitSkip(req, name, "development");
      return next();
    }
    if (skipPrivileged && isPrivilegedUser(req)) {
      logRateLimitSkip(req, name, "privileged_role");
      return next();
    }

    const now = Date.now();
    const key = getClientKey(req, name);
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + windowMs;
      buckets.set(key, { count: 1, resetAt });

      setRateHeaders(res, {
        max,
        remaining: max - 1,
        resetAt,
      });

      return next();
    }

    bucket.count += 1;

    setRateHeaders(res, {
      max,
      remaining: max - bucket.count,
      resetAt: bucket.resetAt,
    });

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));

      logger.warn("rate_limit_hit", {
        requestId: req.requestId,
        limitType: name,
        ip: getClientIp(req),
        userId: req.user?.id || req.user?._id || null,
        role: req.user?.role || null,
        path: req.originalUrl?.split("?")[0],
        retryAfter,
      });

      if (req.user?.id || req.user?._id) {
        void recordAuditEvent({
          userId: req.user.id || req.user._id,
          eventType: "RATE_LIMIT_TRIGGERED",
          entityType: "RateLimit",
          entityId: name,
          sourceType: "system",
          actorType: "system",
          metadata: {
            requestId: req.requestId,
            path: req.originalUrl?.split("?")[0],
            ip: getClientIp(req),
            retryAfter,
          },
        });
      }

      return fail(res, {
        status: 429,
        message: "Too many requests. Please wait and try again.",
        code: "RATE_LIMITED",
        data: {
          limitType: name,
          retryAfterSeconds: retryAfter,
        },
      });
    }

    return next();
  };
};

const developmentAuthRateLimit = rateLimit({
  name: "auth-dev",
  windowMs: 60 * 1000,
  max: 10000,
});

const productionAuthRateLimit = rateLimit({
  name: "auth",
  windowMs: 15 * 60 * 1000,
  max: 10,
});

export const authRateLimit = (req, res, next) =>
  (isDevelopment() ? developmentAuthRateLimit : productionAuthRateLimit)(req, res, next);

const developmentApiRateLimit = rateLimit({
  name: "api-dev",
  windowMs: 60 * 1000,
  max: 10000,
});

const productionApiRateLimit = rateLimit({
  name: "api",
  windowMs: 60 * 1000,
  max: 300,
  skipPrivileged: true,
});

export const apiRateLimit = (req, res, next) =>
  (isDevelopment() ? developmentApiRateLimit : productionApiRateLimit)(req, res, next);

export const aiRateLimit = rateLimit({
  name: "ai",
  windowMs: 60 * 1000,
  max: isDevelopment() ? 1000 : 20,
});

export const uploadRateLimit = rateLimit({
  name: "upload",
  windowMs: 10 * 60 * 1000,
  max: isDevelopment() ? 1000 : 15,
});

export const beeAssistantRateLimit = rateLimit({
  name: "bee-assistant",
  windowMs: 60 * 1000,
  max: isDevelopment() ? 1000 : 25,
});

export const documentProcessingRateLimit = rateLimit({
  name: "document-processing",
  windowMs: 10 * 60 * 1000,
  max: isDevelopment() ? 1000 : 10,
});

export const webhookRateLimit = rateLimit({
  name: "webhook-ip",
  windowMs: 60 * 1000,
  max: isDevelopment() ? 1000 : 120,
});

export const requestId = (req, res, next) => {
  const id = req.get("X-Request-Id") || crypto.randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  return next();
};

export const securityHeaders = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");

  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return next();
};
