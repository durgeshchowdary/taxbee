import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAnyRole } from "../middleware/rbacMiddleware.js";
import {
  getPlans,
  seedPlans,
  getMyBilling,
} from "../controllers/billingController.js";

const router = express.Router();

router.get("/plans", getPlans);

router.post("/plans/seed", requireAuth, requireAnyRole("admin", "internal"), seedPlans);

router.get("/me", requireAuth, getMyBilling);

export default router;
