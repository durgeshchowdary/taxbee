import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAnyRole } from "../middleware/rbacMiddleware.js";
import {
  createTicket,
  getTickets,
  updateTicket,
  getSupportStats,
} from "../controllers/supportController.js";

const router = express.Router();

router.use(requireAuth);

router.post("/tickets", createTicket);
router.get("/tickets", requireAnyRole("admin", "internal", "support"), getTickets);
router.patch("/tickets/:ticketId", requireAnyRole("admin", "internal", "support"), updateTicket);
router.get("/analytics", requireAnyRole("admin", "internal", "support"), getSupportStats);

export default router;
