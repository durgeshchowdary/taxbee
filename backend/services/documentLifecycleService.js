import ImportedDocument from "../models/ImportedDocument.js";
import { recordAuditEvent } from "./auditTrailService.js";

const DEFAULT_RETENTION_DAYS = 30;

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const softDeleteDocument = async ({ userId, documentId }) => {
  const now = new Date();

  const document = await ImportedDocument.findOneAndUpdate(
    {
      _id: documentId,
      userId,
      deletedAt: null,
    },
    {
      $set: {
        lifecycleStatus: "soft_deleted",
        deletedAt: now,
        deletedBy: userId,
        retentionUntil: addDays(now, DEFAULT_RETENTION_DAYS),
      },
    },
    { new: true }
  );

  if (!document) return null;

  await recordAuditEvent({
    userId,
    eventType: "document_soft_deleted",
    entityType: "ImportedDocument",
    entityId: String(document._id),
    sourceType: "system",
    actorType: "user",
    metadata: {
      retentionUntil: document.retentionUntil,
    },
  });

  return document;
};

export const restoreDocument = async ({ userId, documentId }) => {
  const now = new Date();

  const document = await ImportedDocument.findOneAndUpdate(
    {
      _id: documentId,
      userId,
      deletedAt: { $ne: null },
    },
    {
      $set: {
        lifecycleStatus: "active",
        deletedAt: null,
        deletedBy: null,
        restoredAt: now,
        restoredBy: userId,
        retentionUntil: null,
      },
    },
    { new: true }
  );

  if (!document) return null;

  await recordAuditEvent({
    userId,
    eventType: "document_restored",
    entityType: "ImportedDocument",
    entityId: String(document._id),
    sourceType: "system",
    actorType: "user",
  });

  return document;
};

export const permanentlyDeleteDocument = async ({ userId, documentId }) => {
  const document = await ImportedDocument.findOne({
    _id: documentId,
    userId,
  });

  if (!document) return null;

  await recordAuditEvent({
    userId,
    eventType: "document_permanently_deleted",
    entityType: "ImportedDocument",
    entityId: String(document._id),
    sourceType: "system",
    actorType: "user",
    metadata: {
      fileName: document.fileName,
      documentType: document.documentType,
    },
  });

  await ImportedDocument.deleteOne({
    _id: documentId,
    userId,
  });

  return { deleted: true, documentId };
};