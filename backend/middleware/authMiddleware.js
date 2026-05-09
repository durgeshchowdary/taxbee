import jwt from "jsonwebtoken";
import { fail } from "../utils/apiResponse.js";

export const requireAuth = (req, res, next) => {
  const header = req.get("authorization") || "";
  const [, token] = header.match(/^Bearer\s+(.+)$/i) || [];

  if (!token) {
    return fail(res, {
      status: 401,
      message: "Authentication token is required",
      code: "AUTH_REQUIRED",
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return fail(res, {
      status: 401,
      message: "Invalid or expired authentication token",
      code: "AUTH_INVALID",
    });
  }
};

export const optionalAuth = (req, _res, next) => {
  const header = req.get("authorization") || "";
  const [, token] = header.match(/^Bearer\s+(.+)$/i) || [];

  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    req.user = null;
  }

  return next();
};
