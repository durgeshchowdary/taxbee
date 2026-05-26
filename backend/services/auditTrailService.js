import AuditEvent from "../models/AuditEvent.js";
import { sanitizePlainObject } from "../utils/mongoSafety.js";
import { sanitizeText } from "../middleware/validationMiddleware.js";
import { pageResult, parsePagination } from "../utils/pagination.js";

const AUDIT_TEXT_MAX = 1000;

const cleanMetadata = (metadata = {}) => {
  const next = sanitizePlainObject(metadata) || {};
  delete next.rawText;
  delete next.extractedText;
  delete next.fullPan;
  delete next.password;
  return next;
};

const cleanAuditValue = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "object") return sanitizePlainObject(value);
  return sanitizeText(value, AUDIT_TEXT_MAX);
};

export const serializeAuditEvent = (event) => ({
  id: String(event._id),
  userId: String(event.userId),
  eventType: event.eventType,
  entityType: event.entityType,
  entityId: event.entityId,
  fieldKey: event.fieldKey,
  oldValue: event.oldValue,
  newValue: event.newValue,
  sourceType: event.sourceType,
  sourceDocumentId: event.sourceDocumentId ? String(event.sourceDocumentId) : null,
  confidence: event.confidence,
  actorType: event.actorType,
  timestamp: event.timestamp?.toISOString?.() || event.timestamp,
  metadata: event.metadata || {},
});

export const recordAuditEvent = async ({
  userId,
  eventType,
  entityType = "",
  entityId = "",
  fieldKey = "",
  oldValue = null,
  newValue = null,
  sourceType = "system",
  sourceDocumentId = null,
  confidence = null,
  actorType = "system",
  metadata = {},
}) => {
  if (!userId || !eventType) return null;

  return AuditEvent.create({
    userId,
    eventType,
    entityType: sanitizeText(entityType, 80),
    entityId: entityId ? String(entityId) : "",
    fieldKey: sanitizeText(fieldKey, 200),
    oldValue: cleanAuditValue(oldValue),
    newValue: cleanAuditValue(newValue),
    sourceType,
    sourceDocumentId,
    confidence: Number.isFinite(Number(confidence)) ? Number(confidence) : null,
    actorType,
    metadata: cleanMetadata(metadata),
  });
};

export const recordAuditEvents = async (events = []) => {
  const validEvents = events.filter((event) => event?.userId && event?.eventType);
  if (!validEvents.length) return [];
  return AuditEvent.insertMany(
    validEvents.map((event) => ({
      ...event,
      entityType: sanitizeText(event.entityType, 80),
      entityId: event.entityId ? String(event.entityId) : "",
      fieldKey: sanitizeText(event.fieldKey, 200),
      oldValue: cleanAuditValue(event.oldValue),
      newValue: cleanAuditValue(event.newValue),
      confidence: Number.isFinite(Number(event.confidence)) ? Number(event.confidence) : null,
      metadata: cleanMetadata(event.metadata || {}),
    })),
    { ordered: false }
  );
};

export const listAuditTimeline = async ({ userId, limit = 100, page = 1, skip } = {}) => {
  const pagination = parsePagination({ limit, page, skip }, { defaultLimit: 100, maxLimit: 250 });
  const events = await AuditEvent.find({ userId })
    .select("userId eventType entityType entityId fieldKey oldValue newValue sourceType sourceDocumentId confidence actorType timestamp metadata")
    .sort({ timestamp: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit + 1)
    .lean();
  const result = pageResult(events, pagination);
  return {
    events: result.items.map(serializeAuditEvent),
    pagination: result.pagination,
  };
};

export const listValueTimeline = async ({ userId, fieldKey, limit = 50, page = 1, skip } = {}) => {
  const pagination = parsePagination({ limit, page, skip }, { defaultLimit: 50, maxLimit: 100 });
  const events = await AuditEvent.find({ userId, fieldKey })
    .select("userId eventType entityType entityId fieldKey oldValue newValue sourceType sourceDocumentId confidence actorType timestamp metadata")
    .sort({ timestamp: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit + 1)
    .lean();
  const result = pageResult(events, pagination);
  return {
    events: result.items.map(serializeAuditEvent),
    pagination: result.pagination,
  };
};
