import express from "express";
import {
  getBeeAssistantHealth,
  getBeeAssistantReply,
} from "../controllers/aiController.js";

const router = express.Router();

router.post("/bee-assistant", getBeeAssistantReply);
router.get("/bee-assistant/health", getBeeAssistantHealth);

export default router;
