import express from "express";
import { getJob } from "../controllers/jobController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:id", requireAuth, getJob);

export default router;
