import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import BackupRecord from "../models/BackupRecord.js";

const BACKUP_DIR = path.join(process.cwd(), "backups");

const DEFAULT_COLLECTIONS = [
  "users",
  "plans",
  "subscriptions",
  "payments",
  "invoices",
  "importeddocuments",
  "itrdrafts",
  "audittrails",
  "auditevents",
];

export const createBackupId = () => {
  return `backup_${Date.now()}`;
};

export const createDatabaseBackup = async ({
  type = "manual",
  createdBy = null,
  collections = DEFAULT_COLLECTIONS,
} = {}) => {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const backupId = createBackupId();
  const filePath = path.join(BACKUP_DIR, `${backupId}.json`);

  const record = await BackupRecord.create({
    backupId,
    type,
    status: "created",
    collections,
    filePath,
    createdBy,
  });

  try {
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB connection is not ready");
    }

    const output = {
      backupId,
      createdAt: new Date().toISOString(),
      collections: {},
    };

    for (const collectionName of collections) {
      const docs = await db.collection(collectionName).find({}).toArray();
      output.collections[collectionName] = docs;
    }

    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));

    const stats = fs.statSync(filePath);

    record.status = "completed";
    record.sizeBytes = stats.size;
    record.completedAt = new Date();
    await record.save();

    return record;
  } catch (error) {
    record.status = "failed";
    record.failureReason = error.message;
    await record.save();

    throw error;
  }
};

export const listBackups = async () => {
  return BackupRecord.find({}).sort({ createdAt: -1 }).lean();
};

export const getBackupById = async (backupId) => {
  const backup = await BackupRecord.findOne({ backupId }).lean();

  if (!backup) {
    throw new Error("Backup not found");
  }

  return backup;
};

export default {
  createDatabaseBackup,
  listBackups,
  getBackupById,
};