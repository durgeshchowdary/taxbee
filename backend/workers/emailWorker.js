import {
  processQueuedJobs,
} from "../services/workerQueueService.js";

console.log("TaxBee Email Worker Started");

const startWorker = async () => {
  try {
    const result =
      await processQueuedJobs();

    console.log(
      `Processed ${result.processedCount} jobs`
    );
  } catch (error) {
    console.error(
      "Email worker failed:",
      error.message
    );
  }
};

setInterval(
  startWorker,
  5000
);

startWorker();