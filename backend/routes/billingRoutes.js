import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getPlans,
  seedPlans,
  getMyBilling,
} from "../controllers/billingController.js";

const router = express.Router();

router.get("/plans", getPlans);

router.post("/plans/seed", seedPlans);

router.get("/me", requireAuth, getMyBilling);

export default router;