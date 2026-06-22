import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAnyRole } from "../middleware/rbacMiddleware.js";
import {
  createUsageMetric,
  getUsageAnalyticsSummary,
  getUsageAnalyticsRecent,
} from "../controllers/usageAnalyticsController.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", createUsageMetric);
router.get("/summary", requireAnyRole("admin", "internal", "support"), getUsageAnalyticsSummary);
router.get("/recent", requireAnyRole("admin", "internal", "support"), getUsageAnalyticsRecent);

export default router;
