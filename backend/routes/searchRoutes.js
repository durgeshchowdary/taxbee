import express from "express";
import { searchDocuments } from "../controllers/searchController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", searchDocuments);

export default router;