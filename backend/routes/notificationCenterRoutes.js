import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getNotifications,
  getUnreadNotificationsCount,
  markAsRead,
  broadcast,
} from "../controllers/notificationCenterController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getNotifications);

router.get(
  "/unread-count",
  getUnreadNotificationsCount
);

router.patch(
  "/:notificationId/read",
  markAsRead
);

router.post(
  "/broadcast",
  broadcast
);

export default router;