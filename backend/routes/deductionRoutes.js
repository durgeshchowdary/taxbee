import express from "express";
import { getDeductions, saveDeductions } from "../controllers/deductionController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateBody } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, getDeductions);
router.put(
  "/",
  requireAuth,
  validateBody({
    deductions: { type: "object" },
    sourceType: { type: "enum", values: ["assistant", "manual"], default: "manual" },
    workspaceOwnerId: { type: "string", max: 80 },
  }),
  saveDeductions
);

export default router;
