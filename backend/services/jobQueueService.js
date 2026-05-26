import crypto from "crypto";
import Job from "../models/Job.js";
import { recordAuditEvent } from "./auditTrailService.js";
import { sanitizePlainObject } from "../utils/mongoSafety.js";
import { logger } from "../utils/safeLogger.js";
import { recordJobMetric } from "./metricsService.js";

const FINAL_FAILURE_ATTEMPT_DELAY_MS = 0;
const RETRY_BASE_DELAY_MS = 30_000;

const encryptionKey = () =>
  crypto.createHash("sha256").update(String(process.env.JWT_SECRET || "dev")).digest();

export const encryptPayload = (payload) => {
  if (!payload) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
};

export const decryptPayload = (securePayload) => {
  if (!securePayload) return null;
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(securePayload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(securePayload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(securePayload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
};

export const serializeJob = (job) => ({
  id: String(job._id),
  type: job.type,
  status: job.status,
  attempts: job.attempts,
  maxAttempts: job.maxAttempts,
  failureReason: job.failureReason || "",
  inputRef: job.inputRef || {},
  resultRef: job.resultRef || {},
  queuedAt: job.createdAt?.toISOString?.() || job.createdAt,
  runAfter: job.runAfter?.toISOString?.() || job.runAfter,
  completedAt: job.completedAt?.toISOString?.() || job.completedAt,
  failedAt: job.failedAt?.toISOString?.() || job.failedAt,
});

export const enqueueJob = async ({
  type,
  userId,
  inputRef = {},
  payload = null,
  priority = 0,
  maxAttempts = 3,
  runAfter = new Date(),
}) => {
  const job = await Job.create({
    type,
    userId,
    inputRef: sanitizePlainObject(inputRef),
    securePayload: payload ? encryptPayload(payload) : null,
    priority,
    maxAttempts,
    runAfter,
  });

  await recordAuditEvent({
    userId,
    eventType: "job_queued",
    entityType: "Job",
    entityId: job._id,
    newValue: type,
    sourceType: "system",
    actorType: "system",
    metadata: { jobId: String(job._id), inputRef: job.inputRef },
  });
  recordJobMetric({ type, status: "queued" });
  logger.info("job_queued", {
    jobId: String(job._id),
    type,
    userId: String(userId),
    inputRef: job.inputRef,
  });

  return job;
};

export const claimNextJob = async ({ workerId, lockMs = 5 * 60 * 1000 } = {}) => {
  const now = new Date();
  const staleLock = new Date(Date.now() - lockMs);
  const job = await Job.findOneAndUpdate(
    {
      status: { $in: ["queued", "processing"] },
      runAfter: { $lte: now },
      $or: [{ lockedAt: null }, { lockedAt: { $lte: staleLock } }],
      attempts: { $lt: 10 },
    },
    {
      $set: {
        status: "processing",
        lockedAt: now,
        lockedBy: workerId,
        timeoutAt: new Date(Date.now() + lockMs),
      },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { priority: -1, createdAt: 1 } }
  ).select("+securePayload");
  if (job) {
    recordJobMetric({ type: job.type, status: "claimed" });
    logger.info("job_claimed", {
      jobId: String(job._id),
      type: job.type,
      workerId,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
    });
  }
  return job;
};

export const completeJob = async (job, resultRef = {}) => {
  const updated = await Job.findByIdAndUpdate(
    job._id,
    {
      $set: {
        status: "completed",
        resultRef: sanitizePlainObject(resultRef),
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: "",
        timeoutAt: null,
        securePayload: null,
      },
    },
    { new: true }
  );

  await recordAuditEvent({
    userId: job.userId,
    eventType: "job_completed",
    entityType: "Job",
    entityId: job._id,
    newValue: job.type,
    sourceType: "system",
    actorType: "system",
    metadata: { jobId: String(job._id), resultRef },
  });
  recordJobMetric({ type: job.type, status: "completed" });
  logger.info("job_completed", {
    jobId: String(job._id),
    type: job.type,
    attempts: job.attempts,
    resultRef,
  });

  return updated;
};

export const failJob = async (job, error) => {
  const failureReason = String(error?.message || "Job failed").slice(0, 1000);
  const hasRetry = job.attempts < job.maxAttempts;
  const delay = hasRetry ? RETRY_BASE_DELAY_MS * job.attempts : FINAL_FAILURE_ATTEMPT_DELAY_MS;
  const update = hasRetry
    ? {
        status: "queued",
        failureReason,
        lockedAt: null,
        lockedBy: "",
        timeoutAt: null,
        runAfter: new Date(Date.now() + delay),
      }
    : {
        status: "failed",
        failureReason,
        failedAt: new Date(),
        lockedAt: null,
        lockedBy: "",
        timeoutAt: null,
        securePayload: null,
      };

  const updated = await Job.findByIdAndUpdate(job._id, { $set: update }, { new: true });

  if (!hasRetry) {
    await recordAuditEvent({
      userId: job.userId,
      eventType: "job_failed",
      entityType: "Job",
      entityId: job._id,
      newValue: job.type,
      sourceType: "system",
      actorType: "system",
      metadata: { jobId: String(job._id), failureReason },
    });
  }
  recordJobMetric({ type: job.type, status: hasRetry ? "retry" : "failed" });
  logger.warn("job_failed", {
    jobId: String(job._id),
    type: job.type,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    retryScheduled: hasRetry,
    failureReason,
  });

  return updated;
};

export const cleanupStaleJobs = async ({ olderThanMs = 7 * 24 * 60 * 60 * 1000 } = {}) => {
  const cutoff = new Date(Date.now() - olderThanMs);
  return Job.updateMany(
    {
      status: { $in: ["completed", "failed"] },
      updatedAt: { $lt: cutoff },
      securePayload: { $ne: null },
    },
    { $set: { securePayload: null } }
  );
};
