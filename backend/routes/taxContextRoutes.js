import express from "express";
import { getTaxContext } from "../controllers/taxContextController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, getTaxContext);

export default router;
