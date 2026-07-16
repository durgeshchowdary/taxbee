import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getSystemAlerts } from "../controllers/alertController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getSystemAlerts);

export default router;