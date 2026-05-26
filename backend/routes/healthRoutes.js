import express from "express";
import { getHealth, getMetrics, getReady } from "../controllers/healthController.js";
import { fail } from "../utils/apiResponse.js";
import { logger } from "../utils/safeLogger.js";

const router = express.Router();

const requireMetricsAccess = (req, res, next) => {
  if (process.env.NODE_ENV !== "production") return next();

  const configuredToken = process.env.METRICS_TOKEN;
  const header = req.get("authorization") || "";
  const [, providedToken] = header.match(/^Bearer\s+(.+)$/i) || [];

  if (configuredToken && providedToken === configuredToken) return next();

  logger.warn("metrics_access_denied", {
    requestId: req.requestId,
    route: req.originalUrl?.split("?")[0],
  });

  return fail(res, {
    status: 403,
    message: "Metrics endpoint is private",
    code: "METRICS_PRIVATE",
  });
};

router.get("/health", getHealth);
router.get("/ready", getReady);
router.get("/metrics", requireMetricsAccess, getMetrics);

export default router;
