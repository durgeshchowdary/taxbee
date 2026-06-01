import { processTrialReminders } from "./trialReminderService.js";
import { processRenewalCandidates } from "./recurringBillingService.js";

let schedulerRunning = false;

export const runDailyJobs = async () => {
  console.log("Starting TaxBee scheduled jobs...");

  try {
    await processTrialReminders();

    await processRenewalCandidates();

    console.log("Scheduled jobs completed");
  } catch (error) {
    console.error("Scheduler error:", error.message);
  }
};

export const startScheduler = () => {
  if (schedulerRunning) {
    return;
  }

  schedulerRunning = true;

  console.log("TaxBee scheduler started");

  setInterval(
    async () => {
      await runDailyJobs();
    },
    24 * 60 * 60 * 1000
  );
};

export default {
  startScheduler,
  runDailyJobs,
};