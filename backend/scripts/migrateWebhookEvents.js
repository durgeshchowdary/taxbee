import dotenv from "dotenv";
import mongoose from "mongoose";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import Webhook from "../models/Webhook.js";
import { getMongoUri } from "../utils/env.js";
import { logger } from "../utils/safeLogger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

const migrate = async () => {
  await mongoose.connect(getMongoUri(), { serverSelectionTimeoutMS: 10000 });

  const legacyWebhooks = await Webhook.find({
    event: { $exists: true, $type: "string" },
    $or: [{ events: { $exists: false } }, { events: { $size: 0 } }],
  }).select("+event");

  let migrated = 0;
  for (const webhook of legacyWebhooks) {
    webhook.events = [webhook.event];
    webhook.event = undefined;
    await webhook.save();
    migrated += 1;
  }

  logger.info("webhook_event_migration_completed", { migrated });
  await mongoose.disconnect();
};

migrate().catch(async (error) => {
  logger.error("webhook_event_migration_failed", error);
  await mongoose.disconnect().catch(() => null);
  process.exit(1);
});
