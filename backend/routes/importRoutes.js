import express from "express";
import {
  createImport,
  deleteImport,
  listImports,
  reviewImport,
  uploadImport,
} from "../controllers/importController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { uploadRateLimit } from "../middleware/securityMiddleware.js";
import { validateBody, validateUploadBody } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.post("/upload", uploadRateLimit, validateUploadBody, uploadImport);
router.post(
  "/",
  uploadRateLimit,
  validateBody({
    documentType: { type: "string", max: 80 },
    fileName: { type: "string", required: true, max: 180 },
    mimeType: { type: "string", max: 120 },
    importedAt: { type: "string", max: 80 },
    detectedSections: { type: "array", maxItems: 100 },
    totals: { type: "object" },
    extractedFields: { type: "array", maxItems: 300 },
    auditTrail: { type: "array", maxItems: 200 },
    rawPreview: { type: "object" },
    extractedTextPreview: { type: "string", max: 4000 },
    sourceMetadata: { type: "object" },
  }),
  createImport
);
router.get("/", listImports);
router.patch(
  "/:id/review",
  validateBody({
    extractedFields: { type: "array", maxItems: 300 },
    auditTrail: { type: "array", maxItems: 200 },
    workspaceOwnerId: { type: "string", max: 80 },
  }),
  reviewImport
);
router.delete("/:id", deleteImport);

export default router;
