import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAnyRole } from "../middleware/rbacMiddleware.js";
import { getRevenueDashboard } from "../controllers/billingAnalyticsController.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireAnyRole("admin", "internal"));

router.get("/dashboard", getRevenueDashboard);

export default router;
