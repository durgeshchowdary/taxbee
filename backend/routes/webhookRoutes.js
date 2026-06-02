import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  create,
  getAll,
  disable,
} from "../controllers/webhookController.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", create);

router.get("/", getAll);

router.patch("/:id/disable", disable);

export default router;