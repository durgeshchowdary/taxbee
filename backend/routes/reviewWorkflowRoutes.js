import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";

import {
  createAssignment,
  updateAssignmentStatus,
  getBoard,
} from "../controllers/reviewWorkflowController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/board", getBoard);

router.post("/assignments", createAssignment);

router.patch("/assignments/:id/status", updateAssignmentStatus);

export default router;