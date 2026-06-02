import {
  getUserNotifications,
  getUnreadCount,
  markNotificationRead,
  broadcastNotification,
} from "../services/notificationCenterService.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await getUserNotifications(
      req.user?.id || req.user?._id,
      req.query.limit || 50
    );

    return res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUnreadNotificationsCount = async (req, res) => {
  try {
    const count = await getUnreadCount(
      req.user?.id || req.user?._id
    );

    return res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await markNotificationRead(
      req.params.notificationId,
      req.user?.id || req.user?._id
    );

    return res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const broadcast = async (req, res) => {
  try {
    const result = await broadcastNotification({
      userIds: req.body.userIds || [],
      title: req.body.title,
      message: req.body.message,
      type: req.body.type || "system",
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};