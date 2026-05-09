import { fail } from "../utils/apiResponse.js";

export const notFound = (req, res) =>
  fail(res, {
    status: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: "NOT_FOUND",
  });

export const errorHandler = (error, _req, res, _next) => {
  void _next;

  const status = Number(error.statusCode || error.status || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const isProduction = process.env.NODE_ENV === "production";

  console.error("API error:", {
    message: error.message,
    status: safeStatus,
    stack: isProduction ? undefined : error.stack,
  });

  return fail(res, {
    status: safeStatus,
    message:
      safeStatus === 500 && isProduction
        ? "Internal server error"
        : error.message || "Internal server error",
    code: error.code,
  });
};
