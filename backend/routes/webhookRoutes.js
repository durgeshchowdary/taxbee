import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/rbacMiddleware.js";

import {
  create,
  getAll,
  disable,
  testWebhook,
  update,
} from "../controllers/webhookController.js";

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission("webhooks:manage"));

router.post("/", create);

router.get("/", getAll);

router.post("/test", testWebhook);

router.patch("/:id", update);

router.patch("/:id/disable", disable);

export default router;
