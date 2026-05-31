import ImportedDocument from "../models/ImportedDocument.js";
import { fail } from "../utils/apiResponse.js";
import crypto from "crypto";
import { validateUpload } from "../services/documentProcessingService.js";
import { recordAuditEvent, recordAuditEvents } from "../services/auditTrailService.js";
import { resolveWorkspaceOwner } from "../services/workspaceAccessService.js";
import { sanitizeText } from "../middleware/validationMiddleware.js";
import { requireObjectId } from "../utils/mongoSafety.js";
import { logger } from "../utils/safeLogger.js";
import { enqueueJob, serializeJob } from "../services/jobQueueService.js";
import { extractionAuditEvents, processUploadedDocument } from "../services/documentJobService.js";
import { invalidateUserTaxContextCache, sanitizeQueryError } from "../utils/taxContextService.js";
import { pageResult, parsePagination } from "../utils/pagination.js";
import { syncReviewedFieldsToITRDraft } from "../services/itrDraftSyncService.js";

const normalizeDocumentType = (value = "") => {
  const normalized = String(value).toUpperCase();
  if (normalized.includes("FORM_16") || normalized.includes("FORM 16")) return "FORM_16";
  if (normalized.includes("26AS")) return "FORM_26AS";
  if (normalized.includes("AIS")) return "AIS";
  if (normalized.includes("SALARY")) return "SALARY_SLIP";
  if (normalized.includes("INTEREST")) return "BANK_INTEREST_STATEMENT";
  if (normalized.includes("INSURANCE")) return "INSURANCE_RECEIPT";
  if (normalized.includes("DONATION") || normalized.includes("80G")) return "DONATION_RECEIPT";
  if (normalized.includes("RENT")) return "RENT_RECEIPT";
  if (normalized.includes("CAPITAL") || normalized.includes("BROKER")) return "CAPITAL_GAINS_STATEMENT";
  if (normalized.includes("TAX")) return "TAX_STATEMENT";
  return "UNKNOWN";
};

const normalizeField = (field = {}) => ({
  fieldId: sanitizeText(field.fieldId || field.id || field.path || Date.now(), 200),
  source: sanitizeText(field.source || "", 180),
  label: sanitizeText(field.label || field.path || "Extracted field", 200),
  path: sanitizeText(field.path || "", 200),
  value: sanitizeText(field.value ?? "", 1000),
  originalValue: sanitizeText(field.originalValue ?? field.value ?? "", 1000),
  mappedSection: sanitizeText(field.mappedSection || "", 120),
  confidence: Number.isFinite(Number(field.confidence)) ? Number(field.confidence) : 0,
  status: ["confirmed", "overridden"].includes(field.status) ? field.status : "extracted",
  userOverride: String(field.userOverride || ""),
  updatedAt: field.updatedAt ? new Date(field.updatedAt) : new Date(),
});

const normalizeAuditEntry = (entry = {}) => ({
  entryId: sanitizeText(entry.entryId || entry.id || crypto.randomUUID(), 200),
  timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
  label: sanitizeText(entry.label || "", 200),
  key: sanitizeText(entry.key || "", 120),
  path: sanitizeText(entry.path || "", 200),
  oldValue: sanitizeText(entry.oldValue ?? "", 1000),
  newValue: sanitizeText(entry.newValue ?? "", 1000),
  source: sanitizeText(entry.source || "", 180),
  actor: entry.actor === "user" ? "user" : "parser",
});

const serializeImport = (doc, { includeAuditTrail = true, includePreview = true } = {}) => ({
  id: String(doc._id),
  documentType: doc.documentType,
  fileName: doc.fileName,
  mimeType: doc.mimeType || "",
  importedAt: doc.importedAt?.toISOString?.() || doc.importedAt,
  reviewStatus: doc.reviewStatus || "extracted",
  detectedSections: doc.detectedSections || [],
  totals: doc.totals || {},
  extractedFields: (doc.extractedFields || []).map((field) => ({
    id: field.fieldId,
    source: field.source,
    label: field.label,
    path: field.path,
    value: field.value,
    originalValue: field.originalValue,
    mappedSection: field.mappedSection,
    mappedTaxSection: field.mappedSection,
    confidence: field.confidence,
    status: field.status,
    userOverride: field.userOverride,
    updatedAt: field.updatedAt?.toISOString?.() || field.updatedAt,
  })),
  extractedTextPreview: includePreview ? doc.extractedTextPreview || "" : "",
  sourceMetadata: doc.sourceMetadata || {},
  auditTrail: includeAuditTrail ? (doc.auditTrail || []).slice(0, 25).map((entry) => ({
    id: entry.entryId,
    timestamp: entry.timestamp?.getTime?.() || entry.timestamp,
    label: entry.label,
    key: entry.key,
    path: entry.path,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    source: entry.source,
    actor: entry.actor,
  })) : [],
});

const SYNC_TEXT_LIMIT_BYTES = 250 * 1024;

const shouldProcessAsync = ({ fileBase64 = "", mimeType = "", sizeBytes = 0, text = "" }) => {
  if (fileBase64) return true;
  if (/pdf|image/i.test(mimeType)) return true;
  return Number(sizeBytes) > SYNC_TEXT_LIMIT_BYTES || Buffer.byteLength(String(text || ""), "utf8") > SYNC_TEXT_LIMIT_BYTES;
};

export const uploadImport = async (req, res) => {
  const startedAt = Date.now();
  try {
    const { fileName, mimeType = "", text = "", fileBase64 = "", sizeBytes = 0 } = req.body || {};

    const validation = validateUpload({ fileName, mimeType, sizeBytes: Number(sizeBytes) || 0 });
    if (!validation.ok) {
      return fail(res, { status: validation.status, message: validation.message });
    }

    if (shouldProcessAsync({ fileBase64, mimeType, sizeBytes, text })) {
      const importedDocument = await ImportedDocument.create({
        userId: req.user.id,
        documentType: normalizeDocumentType(fileName),
        fileName: sanitizeText(fileName, 180),
        mimeType,
        reviewStatus: "queued",
        detectedSections: [],
        totals: {},
        extractedFields: [],
        auditTrail: [],
        extractedTextPreview: "",
        sourceMetadata: {
          processingStatus: "queued",
          queuedAt: new Date(),
        },
      });

      const job = await enqueueJob({
        type: "document_extraction",
        userId: req.user.id,
        inputRef: {
          importedDocumentId: String(importedDocument._id),
          fileName: importedDocument.fileName,
          mimeType,
        },
        payload: {
          upload: { fileName, mimeType, text, fileBase64, sizeBytes },
        },
        priority: /pdf|image/i.test(mimeType) ? 10 : 5,
        maxAttempts: 3,
      });

      importedDocument.sourceMetadata = {
        ...importedDocument.sourceMetadata,
        processingStatus: "queued",
        jobId: String(job._id),
      };
      
      await syncReviewedFieldsToITRDraft({
  userKey: workspace.ownerId,
  importedDocument,
});
      invalidateUserTaxContextCache(req.user.id);
      logger.info("upload_import_queued", {
        requestId: req.requestId,
        userId: req.user.id,
        importedDocumentId: String(importedDocument._id),
        jobId: String(job._id),
        fileName,
        mimeType,
        sizeBytes,
        latencyMs: Date.now() - startedAt,
      });

      return res.status(202).json({
        success: true,
        message: "Document queued for background processing",
        data: { import: serializeImport(importedDocument), job: serializeJob(job) },
        import: serializeImport(importedDocument),
        job: serializeJob(job),
      });
    }

    const importedDocument = await processUploadedDocument({
      userId: req.user.id,
      upload: { fileName, mimeType, text, fileBase64 },
    });

    await enqueueJob({
      type: "tax_intelligence_recalculation",
      userId: req.user.id,
      inputRef: { importedDocumentId: String(importedDocument._id) },
      priority: 1,
      maxAttempts: 2,
    });
    invalidateUserTaxContextCache(req.user.id);
    logger.info("upload_import_processed_sync", {
      requestId: req.requestId,
      userId: req.user.id,
      importedDocumentId: String(importedDocument._id),
      fileName,
      mimeType,
      extractedFieldCount: importedDocument.extractedFields.length,
      latencyMs: Date.now() - startedAt,
    });

    res.status(201).json({
      success: true,
      message:
        importedDocument.extractedFields.length > 0
          ? "Document processed and saved to MongoDB"
          : "Document saved to MongoDB, but no confident tax fields were extracted",
      data: { import: serializeImport(importedDocument) },
      import: serializeImport(importedDocument),
    });
  } catch (error) {
    logger.error("uploadImport error", error, { requestId: req.requestId });
    fail(res, {
      status: error.status || 500,
      message: error.status ? error.message : "Server error while processing document",
    });
  }
};

export const createImport = async (req, res) => {
  const startedAt = Date.now();
  try {
    const { documentType, fileName, importedAt, detectedSections, totals, extractedFields, auditTrail, rawPreview } =
      req.body || {};

    if (!fileName) {
      return fail(res, { status: 400, message: "fileName is required" });
    }

    const importedDocument = await ImportedDocument.create({
      userId: req.user.id,
      documentType: normalizeDocumentType(documentType || fileName),
      fileName: sanitizeText(fileName, 180),
      mimeType: req.body?.mimeType || "",
      importedAt: importedAt ? new Date(importedAt) : new Date(),
      reviewStatus: "extracted",
      detectedSections: Array.isArray(detectedSections) ? detectedSections.map(String) : [],
      totals: totals || {},
      extractedFields: Array.isArray(extractedFields) ? extractedFields.map(normalizeField) : [],
      auditTrail: Array.isArray(auditTrail) ? auditTrail.map(normalizeAuditEntry) : [],
      extractedTextPreview: req.body?.extractedTextPreview || "",
      sourceMetadata: req.body?.sourceMetadata || {},
      rawPreview: rawPreview ?? null,
    });

    await recordAuditEvent({
      userId: req.user.id,
      eventType: "document_upload",
      entityType: "ImportedDocument",
      entityId: importedDocument._id,
      newValue: importedDocument.fileName,
      sourceType: "import",
      sourceDocumentId: importedDocument._id,
      actorType: "user",
      metadata: {
        fileName: importedDocument.fileName,
        documentType: importedDocument.documentType,
        extractedFieldCount: importedDocument.extractedFields.length,
      },
    });
    await recordAuditEvents(extractionAuditEvents({ userId: req.user.id, importedDocument }));
    await enqueueJob({
      type: "tax_intelligence_recalculation",
      userId: req.user.id,
      inputRef: { importedDocumentId: String(importedDocument._id) },
      priority: 1,
      maxAttempts: 2,
    });
    invalidateUserTaxContextCache(req.user.id);
    logger.info("import_created", {
      requestId: req.requestId,
      userId: req.user.id,
      importedDocumentId: String(importedDocument._id),
      fileName: importedDocument.fileName,
      extractedFieldCount: importedDocument.extractedFields.length,
      latencyMs: Date.now() - startedAt,
    });

    res.status(201).json({
      success: true,
      message: "Import persisted successfully",
      data: { import: serializeImport(importedDocument) },
      import: serializeImport(importedDocument),
    });
  } catch (error) {
    logger.error("createImport error", error, { requestId: req.requestId });
    fail(res, { status: 500, message: "Server error while saving import" });
  }
};

export const listImports = async (req, res) => {
  try {
    const pagination = parsePagination(req.query, { defaultLimit: 25, maxLimit: 100 });
    const workspace = await resolveWorkspaceOwner(req, "viewDocuments");
    if (!workspace.allowed) {
      return fail(res, { status: 403, message: "You do not have permission to view these imports" });
    }

    const imports = await ImportedDocument.find({
      userId: workspace.ownerUserId,
      deletedAt: null,
    })
      .select("-rawPreview -extractedTextPreview")
      .sort({ importedAt: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit + 1)
      .lean();
    const result = pageResult(imports, pagination);
    const serialized = result.items.map((item) => serializeImport(item, { includeAuditTrail: false, includePreview: false }));

    res.status(200).json({
      success: true,
      message: serialized.length ? "Imports fetched successfully" : "No imported documents yet",
      data: {
        imports: serialized,
        pagination: result.pagination,
        emptyState: serialized.length === 0,
        missingData: serialized.length ? [] : ["importedDocuments"],
      },
      imports: serialized,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error("listImports error", error, {
      requestId: req.requestId,
      authenticated: Boolean(req.user?.id),
      service: "imported documents",
      queryError: sanitizeQueryError(error),
    });
    fail(res, {
      status: 500,
      message: "Could not load imported documents from MongoDB.",
      code: "IMPORTS_LOAD_FAILED",
      data: {
        requestId: req.requestId,
        authenticated: Boolean(req.user?.id),
        service: "imported documents",
        queryError: sanitizeQueryError(error),
      },
    });
  }
};

export const reviewImport = async (req, res) => {
  try {
    const { id } = req.params;
    requireObjectId(id);
    const { extractedFields, auditTrail } = req.body || {};

    const workspace = await resolveWorkspaceOwner(req, "reviewFields");
    if (!workspace.allowed) {
      return fail(res, { status: 403, message: "You do not have permission to review this import" });
    }

    const importedDocument = await ImportedDocument.findOne({
      _id: id,
      userId: workspace.ownerUserId,
      deletedAt: null,
    });

    if (!importedDocument) {
      return fail(res, { status: 404, message: "Import not found" });
    }

    const existingByPath = new Map(
      (importedDocument.extractedFields || []).map((field) => [field.path, field])
    );

    if (Array.isArray(extractedFields)) {
      importedDocument.extractedFields = extractedFields.map(normalizeField);
      importedDocument.reviewStatus = importedDocument.extractedFields.every((field) => field.status !== "extracted")
        ? "confirmed"
        : "extracted";
    }

    if (Array.isArray(auditTrail) && auditTrail.length > 0) {
      importedDocument.auditTrail = [
        ...auditTrail.map(normalizeAuditEntry),
        ...(importedDocument.auditTrail || []),
      ].slice(0, 200);
    }

    await importedDocument.save();
    invalidateUserTaxContextCache(workspace.ownerUserId);

    await recordAuditEvents(
      (importedDocument.extractedFields || [])
        .filter((field) => field.status === "confirmed" || field.status === "overridden")
        .filter((field) => {
          const previous = existingByPath.get(field.path);
          return !previous || previous.status !== field.status || String(previous.value ?? "") !== String(field.value ?? "");
        })
        .map((field) => {
          const previous = existingByPath.get(field.path);
          return {
            userId: workspace.ownerUserId,
            eventType: field.status === "overridden" ? "field_override" : "field_confirmation",
            entityType: "ImportedDocument",
            entityId: importedDocument._id,
            fieldKey: field.path,
            oldValue: previous?.value ?? field.originalValue ?? null,
            newValue: field.value,
            sourceType: "document",
            sourceDocumentId: importedDocument._id,
            confidence: field.confidence,
            actorType: "user",
            metadata: {
              label: field.label,
              mappedSection: field.mappedSection,
              fileName: importedDocument.fileName,
              previousStatus: previous?.status,
              status: field.status,
            },
          };
        })
    );

    res.status(200).json({
      success: true,
      message: "Import review updated successfully",
      data: { import: serializeImport(importedDocument) },
      import: serializeImport(importedDocument),
    });
  } catch (error) {
    logger.error("reviewImport error", error, { requestId: req.requestId });
    fail(res, { status: error.status || 500, message: error.status ? error.message : "Server error while updating import review" });
  }
};

export const deleteImport = async (req, res) => {
  try {
    const { id } = req.params;
    requireObjectId(id);
    const importedDocument = await ImportedDocument.findOneAndUpdate(
      { _id: id, userId: req.user.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!importedDocument) {
      return fail(res, { status: 404, message: "Import not found" });
    }

    await recordAuditEvent({
      userId: req.user.id,
      eventType: "document_delete",
      entityType: "ImportedDocument",
      entityId: importedDocument._id,
      oldValue: importedDocument.fileName,
      sourceType: "document",
      sourceDocumentId: importedDocument._id,
      actorType: "user",
      metadata: {
        fileName: importedDocument.fileName,
        documentType: importedDocument.documentType,
      },
    });
    invalidateUserTaxContextCache(req.user.id);

    res.status(200).json({
      success: true,
      message: "Import removed successfully",
      data: { import: serializeImport(importedDocument) },
    });
  } catch (error) {
    logger.error("deleteImport error", error, { requestId: req.requestId });
    fail(res, { status: error.status || 500, message: error.status ? error.message : "Server error while deleting import" });
  }
};
