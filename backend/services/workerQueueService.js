const workerQueue = [];

export const addJob = async ({
  type,
  payload,
}) => {
  const job = {
    id: String(Date.now()),
    type,
    payload,
    status: "queued",
    createdAt: new Date(),
    attempts: 0,
  };

  workerQueue.push(job);

  return job;
};

export const getQueuedJobs = () => {
  return workerQueue;
};

export const processQueuedJobs =
  async () => {
    const processed = [];

    while (
      workerQueue.length > 0
    ) {
      const job =
        workerQueue.shift();

      job.status =
        "completed";

      job.attempts += 1;

      processed.push(job);
    }

    return {
      processedCount:
        processed.length,
      processed,
    };
  };

export default {
  addJob,
  getQueuedJobs,
  processQueuedJobs,
};