import NotificationPreference from "../models/NotificationPreference.js";

const getUserId = (req) => req.user?._id || req.user?.id;

const allowedFields = [
  "emailNotifications",
  "filingReminders",
  "aiInsights",
  "securityAlerts",
  "productUpdates",
];

const sanitizePreferences = (body = {}) =>
  Object.fromEntries(
    Object.entries(body).filter(
      ([key, value]) => allowedFields.includes(key) && typeof value === "boolean"
    )
  );

export const getPreferences = async (req, res, next) => {
  try {
    const userId = getUserId(req);

    let preferences = await NotificationPreference.findOne({ userId });

    if (!preferences) {
      preferences = await NotificationPreference.create({ userId });
    }

    return res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePreferences = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const updates = sanitizePreferences(req.body);

    const preferences = await NotificationPreference.findOneAndUpdate(
      { userId },
      { $set: updates },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    next(error);
  }
};