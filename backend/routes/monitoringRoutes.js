import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAnyRole } from "../middleware/rbacMiddleware.js";
import { getMonitoringMetrics } from "../controllers/monitoringController.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireAnyRole("admin", "internal", "support"));

router.get("/metrics", getMonitoringMetrics);

export default router;
