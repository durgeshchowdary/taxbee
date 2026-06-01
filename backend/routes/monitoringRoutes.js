import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getMonitoringMetrics } from "../controllers/monitoringController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/metrics", getMonitoringMetrics);

export default router;