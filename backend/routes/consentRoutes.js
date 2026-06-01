import express from "express";
import {
  acceptConsent,
  getMyConsents,
  revokeConsent,
} from "../controllers/consentController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", requireAuth, getMyConsents);
router.post("/accept", requireAuth, acceptConsent);
router.post("/revoke", requireAuth, revokeConsent);

export default router;