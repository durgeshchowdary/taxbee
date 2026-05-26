import express from "express";
import {
  getBeeAssistantHealth,
  getBeeAssistantReply,
} from "../controllers/aiController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { aiRateLimit } from "../middleware/securityMiddleware.js";
import { validateBody } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.post(
  "/bee-assistant",
  requireAuth,
  aiRateLimit,
  validateBody({
    message: { type: "string", required: true, max: 2000 },
    memorySummary: { type: "string", max: 1000 },
  }),
  getBeeAssistantReply
);
router.get("/bee-assistant/health", getBeeAssistantHealth);

export default router;
