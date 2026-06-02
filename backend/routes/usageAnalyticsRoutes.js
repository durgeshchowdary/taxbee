import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createUsageMetric,
  getUsageAnalyticsSummary,
  getUsageAnalyticsRecent,
} from "../controllers/usageAnalyticsController.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", createUsageMetric);
router.get("/summary", getUsageAnalyticsSummary);
router.get("/recent", getUsageAnalyticsRecent);

export default router;