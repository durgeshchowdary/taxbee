import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createTicket,
  getTickets,
  updateTicket,
  getSupportStats,
} from "../controllers/supportController.js";

const router = express.Router();

router.use(requireAuth);

router.post("/tickets", createTicket);
router.get("/tickets", getTickets);
router.patch("/tickets/:ticketId", updateTicket);
router.get("/analytics", getSupportStats);

export default router;