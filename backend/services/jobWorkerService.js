import os from "os";
import { buildTaxIntelligenceReport } from "./taxIntelligenceService.js";
import { cleanupStaleJobs, claimNextJob, completeJob, decryptPayload, enqueueJob, failJob } from "./jobQueueService.js";
import { markDocumentJobFailed, processUploadedDocument } from "./documentJobService.js";
import { getUserTaxContext } from "../utils/taxContextService.js";
import { logger } from "../utils/safeLogger.js";
import { createNotification, sendEmailJob } from "./notificationService.js";
import User from "../models/user.js";

const DEFAULT_POLL_MS = 2_000;

const handlers = {
  async document_extraction(job) {
    const payload = decryptPayload(job.securePayload);
    const importedDocument = await processUploadedDocument({
      userId: String(job.userId),
      importedDocumentId: job.inputRef?.importedDocumentId,
      upload: payload?.upload,
    });
    await enqueueJob({
      type: "tax_intelligence_recalculation",
      userId: String(job.userId),
      inputRef: { importedDocumentId: String(importedDocument._id), parentJobId: String(job._id) },
      priority: 1,
      maxAttempts: 2,
    });
    const user = await User.findById(job.userId).select("email").lean();
    await createNotification({
      userId: String(job.userId),
      recipientEmail: user?.email,
      type: "import_job_completed",
      title: "Document import completed",
      message: "TaxBee finished processing an imported document. Review extracted fields before relying on them for filing.",
      metadata: { importedDocumentId: String(importedDocument._id), documentType: importedDocument.documentType },
      dedupeKey: `import-completed:${importedDocument._id}`,
      priority: 1,
    });
    return {
      importedDocumentId: String(importedDocument._id),
      documentType: importedDocument.documentType,
      extractedFieldCount: importedDocument.extractedFields.length,
    };
  },

  async tax_intelligence_recalculation(job) {
    const startedAt = Date.now();
    const context = await getUserTaxContext(String(job.userId));
    const taxIntelligence = context ? buildTaxIntelligenceReport(context) : null;
    logger.info("tax_intelligence_recalculated", {
      jobId: String(job._id),
      userId: String(job.userId),
      latencyMs: Date.now() - startedAt,
      calculationStatus: taxIntelligence?.calculationStatus?.calculationStatus || "not_calculated",
    });
    if (taxIntelligence?.calculationStatus?.calculationStatus !== "calculated") {
      const user = await User.findById(job.userId).select("email").lean();
      await createNotification({
        userId: String(job.userId),
        recipientEmail: user?.email,
        type: "filing_readiness_reminder",
        title: "Filing readiness is not complete yet",
        message: "TaxBee needs income, deduction, and document context before it can produce a filing-ready estimate.",
        metadata: {
          calculationStatus: taxIntelligence?.calculationStatus?.calculationStatus || "not_calculated",
          missingFields: taxIntelligence?.calculationStatus?.missingFields || [],
        },
        dedupeKey: `filing-readiness:${taxIntelligence?.calculationStatus?.calculationStatus || "not_calculated"}`,
        priority: -1,
      });
    }
    return {
      userId: String(job.userId),
      calculationStatus: taxIntelligence?.calculationStatus?.calculationStatus || "not_calculated",
    };
  },

  async audit_event_enrichment(job) {
    return {
      userId: String(job.userId),
      status: "reserved",
      note: "Audit enrichment hook completed; enrichment rules can be added without changing queue API.",
    };
  },

  async email_invite() {
    return {
      status: "reserved",
      note: "Email/invite sending is queued-compatible and can be enabled in a later phase.",
    };
  },

  async email_send(job) {
    return sendEmailJob(decryptPayload(job.securePayload));
  },

  async cleanup_stale_jobs() {
    const result = await cleanupStaleJobs();
    return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
  },
};

export const processOneJob = async ({ workerId = `${os.hostname()}:${process.pid}` } = {}) => {
  const job = await claimNextJob({ workerId });
  if (!job) return null;

  try {
    const startedAt = Date.now();
    const handler = handlers[job.type];
    if (!handler) throw new Error(`Unsupported job type: ${job.type}`);
    const resultRef = await handler(job);
    logger.info("worker_job_completed", {
      jobId: String(job._id),
      type: job.type,
      workerId,
      attempts: job.attempts,
      latencyMs: Date.now() - startedAt,
    });
    return completeJob(job, resultRef);
  } catch (error) {
    logger.error("worker_job_failed", error, {
      jobId: String(job._id),
      type: job.type,
      workerId,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
    });
    if (job.type === "document_extraction" && job.attempts >= job.maxAttempts) {
      const failedImport = await markDocumentJobFailed({
        importedDocumentId: job.inputRef?.importedDocumentId,
        userId: String(job.userId),
        error,
      });
      const user = await User.findById(job.userId).select("email").lean();
      await createNotification({
        userId: String(job.userId),
        recipientEmail: user?.email,
        type: "import_job_failed",
        title: "Document import needs attention",
        message: "TaxBee could not complete document processing. Re-upload the document or enter the values manually.",
        metadata: {
          importedDocumentId: failedImport?._id ? String(failedImport._id) : job.inputRef?.importedDocumentId,
        },
        dedupeKey: `import-failed:${job.inputRef?.importedDocumentId || job._id}`,
        priority: 2,
      });
    }
    return failJob(job, error);
  }
};

export const startJobWorker = async ({
  workerId = `${os.hostname()}:${process.pid}`,
  pollMs = DEFAULT_POLL_MS,
  once = false,
} = {}) => {
  logger.info("TaxBee job worker started", { workerId, pollMs, once });
  let nextCleanupAt = 0;

  do {
    const processed = await processOneJob({ workerId });
    if (Date.now() >= nextCleanupAt) {
      await cleanupStaleJobs();
      nextCleanupAt = Date.now() + 60 * 60 * 1000;
    }
    if (once) return processed;
    if (!processed) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  } while (true);

  return null;
};
