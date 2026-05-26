import mongoose from "mongoose";
import Job from "../models/Job.js";
import { getInMemoryMetrics } from "../services/metricsService.js";
import { validateEnv } from "../utils/env.js";
import { logger } from "../utils/safeLogger.js";

const databaseState = () =>
  ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] || "unknown";

const envReady = () => {
  try {
    validateEnv();
    return { ok: true, error: "" };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

const version = () => process.env.npm_package_version || process.env.APP_VERSION || "unknown";

export const getHealth = (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  return res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    message: dbConnected ? "Service healthy" : "Service degraded",
    data: {
      status: dbConnected ? "ok" : "degraded",
      app: "taxbee-backend",
      database: databaseState(),
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      version: version(),
    },
  });
};

export const getReady = async (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  const env = envReady();
  let queueReady = false;

  if (dbReady) {
    try {
      await Job.exists({});
      queueReady = true;
    } catch (error) {
      logger.warn("queue_readiness_check_failed", { error: error.message });
    }
  }

  const ready = dbReady && env.ok && queueReady;
  return res.status(ready ? 200 : 503).json({
    success: ready,
    message: ready ? "Service ready" : "Service not ready",
    data: {
      ready,
      database: { ready: dbReady, state: databaseState() },
      env: { ready: env.ok, error: env.ok ? "" : env.error },
      queue: { ready: queueReady, backend: "mongo" },
    },
  });
};

export const getMetrics = async (_req, res) => {
  let jobsByStatus = [];
  let jobsByType = [];
  if (mongoose.connection.readyState === 1) {
    [jobsByStatus, jobsByType] = await Promise.all([
      Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Job.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
    ]);
  }

  const inMemory = getInMemoryMetrics();
  return res.status(200).json({
    success: true,
    message: "Metrics fetched successfully",
    data: {
      ...inMemory,
      jobs: {
        ...inMemory.jobs,
        byStatus: Object.fromEntries(jobsByStatus.map((item) => [item._id, item.count])),
        byType: Object.fromEntries(jobsByType.map((item) => [item._id, item.count])),
      },
    },
  });
};
