import { processAuditQueue } from "../services/auditQueueService.js";

console.log("TaxBee Audit Worker Started");

const run = async () => {
  try {
    const result = await processAuditQueue();
    console.log(`Processed ${result.processedCount} audit jobs`);
  } catch (error) {
    console.error("Audit worker failed:", error.message);
  }
};

setInterval(run, 5000);
run();