import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getRevenueDashboard } from "../controllers/billingAnalyticsController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/dashboard", getRevenueDashboard);

export default router;