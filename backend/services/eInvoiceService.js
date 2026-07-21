import EInvoice from "../models/EInvoice.js";
import { recordAuditEvent } from "./auditTrailService.js";

export const EINVOICE_STATUSES = {
  DRAFT: "draft",
  VALIDATED: "validated",
  IRN_REQUESTED: "irn_requested",
  IRN_GENERATED: "irn_generated",
  QR_GENERATED: "qr_generated",
  SUBMITTED: "submitted",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
  RETRY_PENDING: "retry_pending",
  FAILED: "failed",
};

export const createEInvoice = async (data) => {
  const eInvoice = await EInvoice.create(data);
  await recordAuditEvent({
    userId: eInvoice.userId,
    eventType: "e_invoice_created",
    entityType: "EInvoice",
    entityId: eInvoice._id,
    newValue: eInvoice.invoiceNumber,
    sourceType: "system",
    actorType: "user",
  });
  return eInvoice;
};

export const listEInvoices = async (userId, filter = {}) => {
  const query = { userId, ...filter };
  return EInvoice.find(query)
    .sort({ invoiceDate: -1, createdAt: -1 })
    .lean();
};

export const getEInvoiceById = async (id, userId) => {
  return EInvoice.findOne({ _id: id, userId }).lean();
};

export const updateEInvoice = async (id, userId, updates) => {
  const eInvoice = await EInvoice.findOneAndUpdate(
    { _id: id, userId },
    { $set: updates },
    { new: true }
  ).lean();

  if (eInvoice) {
    await recordAuditEvent({
      userId: eInvoice.userId,
      eventType: "e_invoice_updated",
      entityType: "EInvoice",
      entityId: eInvoice._id,
      newValue: updates.status || eInvoice.status,
      sourceType: "system",
      actorType: "user",
      metadata: { updates },
    });
  }

  return eInvoice;
};

export const addEInvoiceVersion = async ({ id, userId, changes, authorId = null }) => {
  const eInvoice = await EInvoice.findOne({ _id: id, userId });
  if (!eInvoice) return null;

  eInvoice.version += 1;
  eInvoice.versions.push({
    version: eInvoice.version,
    changes,
    authorId,
  });

  Object.assign(eInvoice, changes);
  await eInvoice.save();

  await recordAuditEvent({
    userId: eInvoice.userId,
    eventType: "e_invoice_versioned",
    entityType: "EInvoice",
    entityId: eInvoice._id,
    newValue: `v${eInvoice.version}`,
    sourceType: "system",
    actorType: "user",
    metadata: { changes },
  });

  return eInvoice.toObject();
};
