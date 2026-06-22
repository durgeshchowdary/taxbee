import { fail } from "../utils/apiResponse.js";
import { logger } from "../utils/safeLogger.js";

const ROLE_ALIASES = {
  user: "taxpayer",
  taxpayer: "taxpayer",
  reviewer: "reviewer",
  ca: "ca",
  support: "support",
  admin: "admin",
  internal: "internal",
};

const ROLE_PERMISSIONS = {
  taxpayer: new Set(["profile:read", "billing:read", "webhooks:manage"]),
  reviewer: new Set(["review:read", "review:write"]),
  ca: new Set(["review:read", "review:write"]),
  support: new Set(["support:read", "support:write", "analytics:read"]),
  admin: new Set(["*"]),
  internal: new Set(["*"]),
};

const normalizeRole = (role = "") =>
  ROLE_ALIASES[String(role).trim().toLowerCase()] || String(role).trim().toLowerCase();

const getRole = (req) => normalizeRole(req.user?.role || "taxpayer");

const isAllowedRole = (actualRole, allowedRoles) => {
  const normalizedAllowed = allowedRoles.map(normalizeRole);
  return normalizedAllowed.includes(actualRole);
};

const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || new Set();
  return permissions.has("*") || permissions.has(permission);
};

const deny = (req, res, reason, detail = {}) => {
  logger.warn("rbac_access_denied", {
    requestId: req.requestId,
    reason,
    role: getRole(req),
    path: req.originalUrl?.split("?")[0],
    method: req.method,
    ...detail,
  });

  return fail(res, {
    status: 403,
    message: "You do not have permission to access this resource",
    code: "RBAC_FORBIDDEN",
    data: {
      requestId: req.requestId,
      required: detail.required || null,
    },
  });
};

export const requireAnyRole = (...roles) => (req, res, next) => {
  const actualRole = getRole(req);
  if (isAllowedRole(actualRole, roles)) return next();
  return deny(req, res, "role_not_allowed", { required: roles.map(normalizeRole) });
};

export const requireRole = (...roles) => requireAnyRole(...roles);

export const requirePermission = (...permissions) => (req, res, next) => {
  const actualRole = getRole(req);
  const missing = permissions.filter((permission) => !hasPermission(actualRole, permission));
  if (missing.length === 0) return next();
  return deny(req, res, "permission_missing", { required: permissions });
};

export const rbac = {
  requireRole,
  requireAnyRole,
  requirePermission,
};
