import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getFeatureFlags,
  saveFeatureFlag,
} from "../controllers/featureFlagController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getFeatureFlags);
router.post("/", saveFeatureFlag);

export default router;
