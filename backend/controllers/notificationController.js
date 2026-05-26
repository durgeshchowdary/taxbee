import Notification from "../models/Notification.js";
import { fail } from "../utils/apiResponse.js";
import { pageResult, parsePagination } from "../utils/pagination.js";
import { serializeNotification } from "../services/notificationService.js";
import { logger } from "../utils/safeLogger.js";

export const listNotifications = async (req, res) => {
  try {
    const pagination = parsePagination(req.query, { defaultLimit: 30, maxLimit: 100 });
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit + 1)
        .lean(),
      Notification.countDocuments({ userId: req.user.id, status: "unread" }),
    ]);
    const result = pageResult(notifications, pagination);

    res.status(200).json({
      success: true,
      message: result.items.length ? "Notifications fetched" : "No notifications yet",
      data: {
        notifications: result.items.map(serializeNotification),
        unreadCount,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    logger.error("listNotifications error", error, { requestId: req.requestId });
    fail(res, { status: 500, message: "Server error while fetching notifications" });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { status: "read", readAt: new Date() } },
      { new: true }
    ).lean();

    if (!notification) {
      return fail(res, { status: 404, message: "Notification not found" });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: { notification: serializeNotification(notification) },
    });
  } catch (error) {
    logger.error("markNotificationRead error", error, { requestId: req.requestId });
    fail(res, { status: 500, message: "Server error while updating notification" });
  }
};
