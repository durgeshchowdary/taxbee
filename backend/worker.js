import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { validateEnv } from "./utils/env.js";
import { logger } from "./utils/safeLogger.js";
import { startJobWorker } from "./services/jobWorkerService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

mongoose.set("bufferCommands", false);
mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

const start = async () => {
  try {
    validateEnv();
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    await startJobWorker({
      workerId: process.env.WORKER_ID || `taxbee-worker:${process.pid}`,
      pollMs: Number(process.env.JOB_WORKER_POLL_MS || 2000),
      once: process.argv.includes("--once"),
    });
  } catch (error) {
    logger.error("Job worker startup failed", error);
    process.exitCode = 1;
  } finally {
    if (process.argv.includes("--once")) {
      await mongoose.disconnect();
    }
  }
};

start();
