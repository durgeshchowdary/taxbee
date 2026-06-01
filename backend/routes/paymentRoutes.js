import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createCheckout,
  verifyPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

router.use(requireAuth);

router.post("/checkout", createCheckout);
router.post("/verify", verifyPayment);

export default router;