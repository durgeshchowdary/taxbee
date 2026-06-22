import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAnyRole } from "../middleware/rbacMiddleware.js";
import {
  createBackup,
  getBackups,
  getBackup,
  restoreBackup,
} from "../controllers/backupController.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireAnyRole("admin", "internal"));

router.post("/", createBackup);
router.get("/", getBackups);
router.get("/:backupId", getBackup);
router.post("/:backupId/restore", restoreBackup);

export default router;
