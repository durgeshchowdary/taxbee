import express from "express";
import { getTaxSavings } from "../controllers/taxSavingsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, getTaxSavings);

export default router;
