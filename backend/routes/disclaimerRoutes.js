import express from "express";
import { TAX_DISCLAIMER } from "../utils/taxDisclaimer.js";

const router = express.Router();

router.get("/tax", (_req, res) => {
  res.json({
    success: true,
    data: TAX_DISCLAIMER,
  });
});

export default router;