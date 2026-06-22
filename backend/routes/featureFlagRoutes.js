import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAnyRole } from "../middleware/rbacMiddleware.js";
import {
  getFeatureFlags,
  saveFeatureFlag,
} from "../controllers/featureFlagController.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireAnyRole("admin", "internal"));

router.get("/", getFeatureFlags);
router.post("/", saveFeatureFlag);

export default router;
