import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";

import {
  deleteDocument,
  restoreDeletedDocument,
  permanentlyDelete,
} from "../controllers/documentLifecycleController.js";

const router = express.Router();

router.post("/:id/delete", requireAuth, deleteDocument);

router.post("/:id/restore", requireAuth, restoreDeletedDocument);

router.delete("/:id/permanent", requireAuth, permanentlyDelete);

export default router;