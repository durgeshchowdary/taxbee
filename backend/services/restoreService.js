import fs from "fs";
import mongoose from "mongoose";
import BackupRecord from "../models/BackupRecord.js";

export const restoreDatabaseBackup = async ({
  backupId,
  dryRun = true,
} = {}) => {
  const record = await BackupRecord.findOne({ backupId });

  if (!record) {
    throw new Error("Backup not found");
  }

  if (!record.filePath || !fs.existsSync(record.filePath)) {
    throw new Error("Backup file not found");
  }

  const raw = fs.readFileSync(record.filePath, "utf8");
  const backup = JSON.parse(raw);

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB connection is not ready");
  }

  const summary = {};

  for (const [collectionName, docs] of Object.entries(backup.collections || {})) {
    summary[collectionName] = {
      documents: Array.isArray(docs) ? docs.length : 0,
      restored: false,
    };

    if (!dryRun && Array.isArray(docs)) {
      const collection = db.collection(collectionName);

      await collection.deleteMany({});

      if (docs.length > 0) {
        await collection.insertMany(docs);
      }

      summary[collectionName].restored = true;
    }
  }

  if (!dryRun) {
    record.status = "restored";
    record.restoredAt = new Date();
    await record.save();
  }

  return {
    backupId,
    dryRun,
    summary,
  };
};

export default {
  restoreDatabaseBackup,
};