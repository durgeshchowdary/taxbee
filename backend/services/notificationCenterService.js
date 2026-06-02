import Notification from "../models/Notification.js";

export const createNotification = async ({
  userId,
  title,
  message,
  type = "system",
  metadata = {},
}) => {
  return Notification.create({
    userId,
    title,
    message,
    type,
    metadata,
  });
};

export const getUserNotifications = async (
  userId,
  limit = 50
) => {
  return Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
};

export const getUnreadCount = async (userId) => {
  return Notification.countDocuments({
    userId,
    isRead: false,
  });
};

export const markNotificationRead = async (
  notificationId,
  userId
) => {
  return Notification.findOneAndUpdate(
    {
      _id: notificationId,
      userId,
    },
    {
      isRead: true,
    },
    {
      new: true,
    }
  );
};

export const broadcastNotification = async ({
  userIds,
  title,
  message,
  type = "system",
}) => {
  const notifications = userIds.map((userId) => ({
    userId,
    title,
    message,
    type,
  }));

  return Notification.insertMany(notifications);
};

export default {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markNotificationRead,
  broadcastNotification,
};