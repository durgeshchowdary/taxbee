const auditQueue = [];

export const queueAuditEvent = async (event) => {
  const job = {
    id: String(Date.now()),
    event,
    status: "queued",
    attempts: 0,
    createdAt: new Date(),
  };

  auditQueue.push(job);
  return job;
};

export const getQueuedAuditEvents = () => auditQueue;

export const processAuditQueue = async () => {
  const processed = [];

  while (auditQueue.length > 0) {
    const job = auditQueue.shift();
    job.status = "completed";
    job.attempts += 1;
    job.completedAt = new Date();
    processed.push(job);
  }

  return {
    processedCount: processed.length,
    processed,
  };
};

export default {
  queueAuditEvent,
  getQueuedAuditEvents,
  processAuditQueue,
};