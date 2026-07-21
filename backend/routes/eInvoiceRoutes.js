import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAnyRole } from "../middleware/rbacMiddleware.js";
import { validateBody } from "../middleware/validationMiddleware.js";
import {
  create,
  list,
  getOne,
  update,
} from "../controllers/eInvoiceController.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireAnyRole("taxpayer", "ca", "admin", "internal"));

const eInvoiceCreateSchema = {
  invoiceNumber: { type: "string", required: true, max: 120 },
  invoiceDate: { type: "string", required: true, max: 30 },
  sellerGstin: { type: "string", required: true, max: 15 },
  buyerGstin: { type: "string", required: true, max: 15 },
  buyerName: { type: "string", required: true, max: 180 },
  stateCode: { type: "string", required: true, max: 4 },
  invoiceType: {
    type: "enum",
    values: ["regular", "deemed_export", "bill_of_supply", "export", "other"],
    default: "regular",
  },
  lineItems: { type: "array" },
  subtotalAmount: { type: "number", min: 0 },
  totalTaxAmount: { type: "number", min: 0 },
  invoiceValue: { type: "number", min: 0 },
  metadata: { type: "object" },
};

const eInvoiceUpdateSchema = {
  buyerName: { type: "string", max: 180 },
  stateCode: { type: "string", max: 4 },
  invoiceType: {
    type: "enum",
    values: ["regular", "deemed_export", "bill_of_supply", "export", "other"],
  },
  lineItems: { type: "array" },
  subtotalAmount: { type: "number", min: 0 },
  totalTaxAmount: { type: "number", min: 0 },
  invoiceValue: { type: "number", min: 0 },
  status: {
    type: "enum",
    values: [
      "draft",
      "validated",
      "irn_requested",
      "irn_generated",
      "qr_generated",
      "submitted",
      "cancelled",
      "rejected",
      "retry_pending",
      "failed",
    ],
  },
  validationErrors: { type: "array" },
  cancellationReason: { type: "string", max: 400 },
  metadata: { type: "object" },
};

router.get("/", list);
router.post("/", validateBody(eInvoiceCreateSchema), create);
router.get("/:id", getOne);
router.patch("/:id", validateBody(eInvoiceUpdateSchema), update);

export default router;
