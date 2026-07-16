import jwt from "jsonwebtoken";
import { fail } from "../utils/apiResponse.js";
import { logger } from "../utils/safeLogger.js";
import { getJwtAudience, getJwtIssuer } from "../utils/env.js";
import { isUserEmailVerified } from "../utils/emailVerification.js";

const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ["HS256"],
    maxAge: "1d",
    issuer: getJwtIssuer(),
    audience: getJwtAudience(),
  });

const attachUser = (req, payload) => {
  if (!payload?.id || typeof payload.id !== "string") return false;
  req.user = {
    id: payload.id,
    role: typeof payload.role === "string" ? payload.role : "taxpayer",
    isVerified: payload.isVerified === undefined ? undefined : isUserEmailVerified(payload),
  };
  return true;
};

const cookieToken = (req) => {
  const cookie = req.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
};

const requestToken = (req) => {
  const header = req.get("authorization") || "";
  const [, bearer] = header.match(/^Bearer\s+(.+)$/i) || [];
  return (bearer || cookieToken(req)).trim();
};

export const requireAuth = (req, res, next) => {
  if (req.authValidated && req.user?.id) {
    return next();
  }

  const token = requestToken(req);

  if (!token) {
    logger.warn("auth_failure", {
      requestId: req.requestId,
      reason: "missing_token",
      route: req.originalUrl?.split("?")[0],
    });
    return fail(res, {
      status: 401,
      message: "Authentication token is required",
      code: "AUTH_REQUIRED",
      data: {
        requestId: req.requestId,
        authenticated: false,
        service: "auth",
      },
    });
  }

  try {
    const payload = verifyToken(token);
    if (payload.isVerified !== undefined && !isUserEmailVerified(payload)) {
      return fail(res, {
        status: 403,
        message: "Email verification is required before accessing TaxBee workspaces",
        code: "EMAIL_VERIFICATION_REQUIRED",
        data: {
          requestId: req.requestId,
          authenticated: true,
          service: "auth",
        },
      });
    }
    if (!attachUser(req, payload)) {
      throw new Error("Invalid token payload");
    }
    req.authValidated = true;
    logger.info("user_role_context", {
      requestId: req.requestId,
      userId: req.user.id,
      role: req.user.role,
      route: req.originalUrl?.split("?")[0],
    });
    return next();
  } catch {
    logger.warn("auth_failure", {
      requestId: req.requestId,
      reason: "invalid_token",
      route: req.originalUrl?.split("?")[0],
    });
    return fail(res, {
      status: 401,
      message: "Invalid or expired authentication token",
      code: "AUTH_INVALID",
      data: {
        requestId: req.requestId,
        authenticated: false,
        service: "auth",
      },
    });
  }
};

export const optionalAuth = (req, _res, next) => {
  if (req.authValidated) return next();

  const token = requestToken(req);

  if (!token) return next();

  try {
    attachUser(req, verifyToken(token));
    if (req.user?.id) {
      req.authValidated = true;
      logger.info("user_role_context", {
        requestId: req.requestId,
        userId: req.user.id,
        role: req.user.role,
        route: req.originalUrl?.split("?")[0],
      });
    }
  } catch {
    req.user = null;
  }

  return next();
};
