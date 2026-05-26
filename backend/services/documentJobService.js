import ImportedDocument from "../models/ImportedDocument.js";
import { extractDocumentText, processTaxDocument } from "./documentProcessingService.js";
import { recordAuditEvent, recordAuditEvents } from "./auditTrailService.js";
import { logger } from "../utils/safeLogger.js";
import { invalidateUserTaxContextCache } from "../utils/taxContextService.js";
import { recordJobMetric } from "./metricsService.js";

export const extractionAuditEvents = ({ userId, importedDocument }) =>
  (importedDocument.extractedFields || []).map((field) => ({
    userId,
    eventType: "field_extraction",
    entityType: "ImportedDocument",
    entityId: importedDocument._id,
    fieldKey: field.path,
    oldValue: null,
    newValue: field.value,
    sourceType: "document",
    sourceDocumentId: importedDocument._id,
    confidence: field.confidence,
    actorType: "system",
    metadata: {
      label: field.label,
      mappedSection: field.mappedSection,
      fileName: importedDocument.fileName,
      documentType: importedDocument.documentType,
      status: field.status,
    },
  }));

const ocrAuditEvent = ({ userId, importedDocument }) => {
  const extraction = importedDocument.sourceMetadata?.extraction || {};
  if (!extraction.ocrAttempted && !String(extraction.extractionMode || "").includes("ocr")) return null;
  return {
    userId,
    eventType: "ocr_completed",
    entityType: "ImportedDocument",
    entityId: importedDocument._id,
    fieldKey: "document.ocr",
    oldValue: null,
    newValue: extraction.extractionMode,
    sourceType: "document",
    sourceDocumentId: importedDocument._id,
    confidence: extraction.confidence,
    actorType: "system",
    metadata: {
      fileName: importedDocument.fileName,
      documentType: importedDocument.documentType,
      extractionMode: extraction.extractionMode,
      ocrEngine: extraction.ocrEngine || extraction.ocrFallback?.ocrEngine,
    },
  };
};

const recordOcrStarted = async ({ userId, importedDocumentId, fileName, mimeType }) => {
  if (!importedDocumentId) return null;
  return recordAuditEvent({
    userId,
    eventType: "ocr_started",
    entityType: "ImportedDocument",
    entityId: importedDocumentId,
    fieldKey: "document.ocr",
    sourceType: "document",
    sourceDocumentId: importedDocumentId,
    actorType: "system",
    metadata: { fileName, mimeType },
  });
};

const recordOcrFailed = async ({ userId, importedDocumentId, fileName, mimeType, extraction, message }) => {
  if (!importedDocumentId) return null;
  return recordAuditEvent({
    userId,
    eventType: "ocr_failed",
    entityType: "ImportedDocument",
    entityId: importedDocumentId,
    fieldKey: "document.ocr",
    newValue: extraction?.ocrCode || extraction?.ocrFallback?.code || "OCR_FAILED",
    sourceType: "document",
    sourceDocumentId: importedDocumentId,
    actorType: "system",
    metadata: {
      fileName,
      mimeType,
      extractionMode: extraction?.extractionMode,
      ocrEngine: extraction?.ocrEngine || extraction?.ocrFallback?.ocrEngine,
      reason: String(message || "OCR failed").slice(0, 300),
    },
  });
};

export const processUploadedDocument = async ({ userId, importedDocumentId = null, upload }) => {
  const { fileName, mimeType = "", text = "", fileBase64 = "" } = upload || {};
  const startedAt = Date.now();
  logger.info("document_extraction_started", {
    userId,
    importedDocumentId,
    fileName,
    mimeType,
    mode: fileBase64 ? "binary" : "text",
    textBytes: Buffer.byteLength(String(text || ""), "utf8"),
  });
  if (importedDocumentId) {
    await ImportedDocument.findOneAndUpdate(
      { _id: importedDocumentId, userId, deletedAt: null },
      {
        reviewStatus: "processing",
        "sourceMetadata.processingStatus": "processing",
        "sourceMetadata.processingStartedAt": new Date(),
      }
    );
  }

  const extracted = await extractDocumentText({ fileName, mimeType, text, fileBase64 });
  if (extracted.extractionMetadata?.ocrAttempted) {
    await recordOcrStarted({ userId, importedDocumentId, fileName, mimeType });
  }
  logger.info("document_text_extracted", {
    userId,
    importedDocumentId,
    fileName,
    mimeType,
    extractionMode: extracted.extractionMetadata?.extractionMode,
    extractor: extracted.extractionMetadata?.extractor,
    warningCount: extracted.extractionWarnings?.length || 0,
  });

  if (typeof extracted.text !== "string" || extracted.text.trim().length === 0) {
    const error = new Error(
      extracted.extractionWarnings?.[0] || "TaxBee could not extract readable text from this document."
    );
    error.status = extracted.extractionMetadata?.ocrCode === "OCR_NOT_CONFIGURED" ? 503 : 422;
    error.code = extracted.extractionMetadata?.ocrCode || "DOCUMENT_TEXT_NOT_EXTRACTED";
    error.sourceMetadata = {
      extraction: extracted.extractionMetadata,
      extractionWarnings: extracted.extractionWarnings,
    };
    if (extracted.extractionMetadata?.ocrAttempted) {
      await recordOcrFailed({
        userId,
        importedDocumentId,
        fileName,
        mimeType,
        extraction: extracted.extractionMetadata,
        message: error.message,
      });
    }
    throw error;
  }

  const processed = processTaxDocument({
    fileName,
    mimeType,
    text: extracted.text,
    extractionMetadata: extracted.extractionMetadata,
    extractionWarnings: extracted.extractionWarnings,
  });

  const importedDocument = importedDocumentId
    ? await ImportedDocument.findOneAndUpdate(
        { _id: importedDocumentId, userId, deletedAt: null },
        {
          ...processed,
          reviewStatus: "extracted",
          sourceMetadata: {
            ...processed.sourceMetadata,
            processingStatus: "completed",
            processingCompletedAt: new Date(),
          },
        },
        { new: true, runValidators: true }
      )
    : await ImportedDocument.create({ userId, ...processed });

  if (!importedDocument) {
    const error = new Error("Import placeholder was not found");
    error.status = 404;
    throw error;
  }

  await recordAuditEvent({
    userId,
    eventType: "document_upload",
    entityType: "ImportedDocument",
    entityId: importedDocument._id,
    newValue: importedDocument.fileName,
    sourceType: "document",
    sourceDocumentId: importedDocument._id,
    actorType: "user",
    metadata: {
      fileName: importedDocument.fileName,
      documentType: importedDocument.documentType,
      mimeType: importedDocument.mimeType,
      extractedFieldCount: importedDocument.extractedFields.length,
      async: Boolean(importedDocumentId),
    },
  });

  await recordAuditEvents([
    ocrAuditEvent({ userId, importedDocument }),
    ...extractionAuditEvents({ userId, importedDocument }),
  ].filter(Boolean));

  if (importedDocument.sourceMetadata?.extraction?.extractionMode === "ocr_pdf_pages") {
    recordJobMetric({ type: "scanned_pdf_ocr", status: "completed" });
  }

  logger.info("document_extraction_completed", {
    userId,
    importedDocumentId: String(importedDocument._id),
    fileName: importedDocument.fileName,
    documentType: importedDocument.documentType,
    extractedFieldCount: importedDocument.extractedFields.length,
    latencyMs: Date.now() - startedAt,
  });
  invalidateUserTaxContextCache(userId);

  return importedDocument;
};

export const markDocumentJobFailed = async ({ importedDocumentId, userId, error }) => {
  if (!importedDocumentId) return null;
  logger.warn("document_extraction_failed", {
    userId,
    importedDocumentId,
    failureReason: error?.message || "Document processing failed",
  });
  const updated = await ImportedDocument.findOneAndUpdate(
    { _id: importedDocumentId, userId, deletedAt: null },
    {
      reviewStatus: "failed",
      sourceMetadata: {
        processingStatus: "failed",
        failureReason: String(error?.message || "Document processing failed").slice(0, 500),
        failureCode: error?.code || "DOCUMENT_PROCESSING_FAILED",
        ...(error?.sourceMetadata || {}),
      },
    },
    { new: true }
  );
  if (
    error?.sourceMetadata?.extraction?.extractionMode === "ocr_pdf_failed" ||
    error?.sourceMetadata?.extraction?.extractionMode === "ocr_pdf_render_failed"
  ) {
    recordJobMetric({ type: "scanned_pdf_ocr", status: "failed" });
  }
  invalidateUserTaxContextCache(userId);
  return updated;
};
