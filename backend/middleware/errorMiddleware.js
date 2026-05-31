import { fail } from "../utils/apiResponse.js";
import { logger } from "../utils/safeLogger.js";
import { captureException } from "../utils/sentry.js";

export const notFound = (req, res) =>
  fail(res, {
    status: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: "NOT_FOUND",
  });

export const errorHandler = (error, req, res, next) => {
  void next;

  const status = Number(error.statusCode || error.status || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const isProduction = process.env.NODE_ENV === "production";

  logger.error("API error", error, {
    status: safeStatus,
    requestId: req.requestId,
    route: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
  });

  if (safeStatus >= 500) {
    captureException(error, {
      requestId: req.requestId,
      route: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
      status: safeStatus,
    });
  }

  return fail(res, {
    status: safeStatus,
    message:
      (safeStatus === 500 || error.expose === false) && isProduction
        ? "Internal server error"
        : error.message || "Internal server error",
    code: error.code,
    data: {
      requestId: req.requestId,
    },
  });
};