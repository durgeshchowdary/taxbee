import { logger } from "../utils/safeLogger.js";
import { recordRequestMetric } from "../services/metricsService.js";

const routeName = (req) => {
  const base = req.baseUrl || "";
  const route = req.route?.path || req.path || req.originalUrl?.split("?")[0] || "";
  return `${base}${route}` || req.originalUrl?.split("?")[0] || "unknown";
};

export const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const route = routeName(req);

    recordRequestMetric({
      method: req.method,
      route,
      statusCode: res.statusCode,
      durationMs,
    });

    logger.info("api_request", {
      requestId: req.requestId,
      method: req.method,
      route,
      statusCode: res.statusCode,
      latencyMs: Math.round(durationMs),
      userId: req.user?.id || null,
    });
  });

  return next();
};
