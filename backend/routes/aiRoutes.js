import express from "express";
import {
  getBeeAssistantHealth,
  getBeeAssistantReply,
} from "../controllers/aiController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/bee-assistant", requireAuth, getBeeAssistantReply);
router.get("/bee-assistant/health", getBeeAssistantHealth);

export default router;
