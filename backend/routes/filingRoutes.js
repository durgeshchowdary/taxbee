import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  create,
  list,
  getOne,
  updateStatus,
} from "../controllers/filingController.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", create);
router.get("/", list);
router.get("/:id", getOne);
router.patch("/:id/status", updateStatus);

export default router;
