import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAnyRole } from "../middleware/rbacMiddleware.js";
import {
  getDashboardStats,
  getDashboardHealth,
  getDashboardActivity,
} from "../controllers/adminDashboardController.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireAnyRole("admin", "internal"));

router.get("/stats", getDashboardStats);
router.get("/health", getDashboardHealth);
router.get("/activity", getDashboardActivity);

export default router;
