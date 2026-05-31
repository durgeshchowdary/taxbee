import crypto from "crypto";
import { fail } from "../utils/apiResponse.js";

const buckets = new Map();

const rateKey = (req, name) => `${name}:${req.user?.id || req.ip || "unknown"}`;
const isDevelopment = () => process.env.NODE_ENV === "development";

export const rateLimit = ({ name, windowMs, max }) => (req, res, next) => {
  const now = Date.now();
  const key = rateKey(req, name);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(max - 1, 0)));
    res.setHeader("RateLimit-Reset", String(Math.ceil((now + windowMs) / 1000)));
    return next();
  }

  bucket.count += 1;
  const remaining = Math.max(max - bucket.count, 0);
  res.setHeader("RateLimit-Limit", String(max));
  res.setHeader("RateLimit-Remaining", String(remaining));
  res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > max) {
    if (isDevelopment()) {
      console.warn("[RATE LIMIT]", req.ip, req.originalUrl);
    }
    res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return fail(res, {
      status: 429,
      message: "Too many requests. Please wait and try again.",
      code: "RATE_LIMITED",
    });
  }

  return next();
};

const developmentAuthRateLimit = rateLimit({
  name: "auth",
  windowMs: 60 * 1000,
  max: 10000,
});
const productionAuthRateLimit = rateLimit({ name: "auth", windowMs: 15 * 60 * 1000, max: 10 });

export const authRateLimit = (req, res, next) =>
  (isDevelopment() ? developmentAuthRateLimit : productionAuthRateLimit)(req, res, next);
export const aiRateLimit = rateLimit({ name: "ai", windowMs: 60 * 1000, max: 20 });
export const uploadRateLimit = rateLimit({ name: "upload", windowMs: 10 * 60 * 1000, max: 15 });
export const apiRateLimit = rateLimit({ name: "api", windowMs: 60 * 1000, max: 300 });

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
