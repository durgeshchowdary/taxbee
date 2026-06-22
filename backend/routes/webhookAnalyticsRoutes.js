import express from "express";

import { requireAuth }
  from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/rbacMiddleware.js";

import {
  getAnalytics,
} from "../controllers/webhookAnalyticsController.js";

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission("webhooks:manage"));

router.get("/", getAnalytics);

export default router;
