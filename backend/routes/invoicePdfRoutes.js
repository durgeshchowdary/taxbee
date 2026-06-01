import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { downloadInvoicePdf } from "../controllers/invoicePdfController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/:invoiceId/download", downloadInvoicePdf);

export default router;