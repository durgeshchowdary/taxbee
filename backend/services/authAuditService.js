import { recordAuditEvent } from "./auditTrailService.js";
import { logger } from "../utils/safeLogger.js";

const authMetadata = ({ requestId, ...metadata } = {}) => ({
  ...(requestId ? { requestId } : {}),
  ...metadata,
});

export const recordAuthAuditEvent = async ({
  userId,
  eventType,
  metadata = {},
  requestId,
  actorType = "user",
}) => {
  if (!userId || !eventType) return null;

  try {
    return await recordAuditEvent({
      userId,
      eventType,
      entityType: "Auth",
      entityId: String(userId),
      sourceType: "system",
      actorType,
      metadata: authMetadata({ requestId, ...metadata }),
    });
  } catch (error) {
    logger.error("auth_audit_event_failed", error, {
      requestId,
      userId: String(userId),
      eventType,
    });
    return null;
  }
};

export const recordAuthFailureAudit = async ({
  userId,
  eventType = "auth_login_failed",
  reason,
  metadata = {},
  requestId,
}) => {
  logger.warn("auth_failure", {
    requestId,
    reason,
    ...(userId ? { userId: String(userId) } : {}),
    ...metadata,
  });

  if (!userId) return null;

  return recordAuthAuditEvent({
    userId,
    eventType,
    requestId,
    metadata: { reason, ...metadata },
    actorType: "user",
  });
};
