import {
  createDatabaseBackup,
  listBackups,
  getBackupById,
} from "../services/backupService.js";
import { restoreDatabaseBackup } from "../services/restoreService.js";

export const createBackup = async (req, res) => {
  try {
    const backup = await createDatabaseBackup({
      type: "manual",
      createdBy: req.user?.id || req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      data: backup,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getBackups = async (req, res) => {
  try {
    const backups = await listBackups();

    return res.json({
      success: true,
      data: backups,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getBackup = async (req, res) => {
  try {
    const backup = await getBackupById(req.params.backupId);

    return res.json({
      success: true,
      data: backup,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

export const restoreBackup = async (req, res) => {
  try {
    const result = await restoreDatabaseBackup({
      backupId: req.params.backupId,
      dryRun: req.body?.dryRun !== false,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};