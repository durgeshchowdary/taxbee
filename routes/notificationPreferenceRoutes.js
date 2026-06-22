import express from "express";
import {
  getPreferences,
  updatePreferences,
} from "../controllers/notificationPreferenceController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, getPreferences);
router.put("/", requireAuth, updatePreferences);

export default router;