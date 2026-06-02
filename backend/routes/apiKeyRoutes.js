import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createKey,
  getKeys,
  revokeKey,
  rotateKey,
} from "../controllers/apiKeyController.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", createKey);

router.get("/", getKeys);

router.delete("/:id", revokeKey);

router.post("/:id/rotate", rotateKey);

export default router;