import dotenv from "dotenv";
import mongoose from "mongoose";
import { processSubscriptionLifecycle } from "../services/billingAutomationService.js";
import { getMongoUri } from "../utils/env.js";
import { logger } from "../utils/safeLogger.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(getMongoUri(), {
      serverSelectionTimeoutMS: 10000,
    });

    const result = await processSubscriptionLifecycle();

    logger.info("billing_automation_completed", result);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error("billing_automation_failed", error);
    await mongoose.disconnect().catch(() => null);
    process.exit(1);
  }
};

run();