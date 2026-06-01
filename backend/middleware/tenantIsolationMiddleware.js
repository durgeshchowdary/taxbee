import mongoose from "mongoose";
import { logger } from "../utils/safeLogger.js";

const getUserId = (req) => req.user?._id || req.user?.id;

export const requireTenantUser = (req, res, next) => {
  const userId = getUserId(req);

  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    logger.warn("Tenant isolation blocked unauthenticated request", {
      path: req.originalUrl,
      method: req.method,
    });

    return res.status(401).json({
      success: false,
      message: "Authentication required for tenant-scoped resource",
      data: null,
      code: "TENANT_AUTH_REQUIRED",
    });
  }

  req.tenant = {
    userId: String(userId),
  };

  return next();
};

export const enforceOwner = (resourceUserId) => (req, res, next) => {
  const userId = String(getUserId(req) || "");
  const ownerId = String(resourceUserId || "");

  if (!userId || !ownerId || userId !== ownerId) {
    logger.warn("Tenant isolation violation blocked", {
      path: req.originalUrl,
      method: req.method,
      userId,
      ownerId,
    });

    return res.status(403).json({
      success: false,
      message: "Access denied for this tenant-scoped resource",
      data: null,
      code: "TENANT_ACCESS_DENIED",
    });
  }

  return next();
};

export const tenantFilter = (req, extra = {}) => {
  const userId = getUserId(req);

  return {
    ...extra,
    userId,
  };
};