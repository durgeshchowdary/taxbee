import express from "express";
import {
  getAuditTimeline,
  getValueAuditTimeline,
} from "../controllers/auditTimelineController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getAuditTimeline);
router.get("/value/:fieldKey", getValueAuditTimeline);

export default router;
