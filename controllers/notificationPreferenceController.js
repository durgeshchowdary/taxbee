import NotificationPreference from "../models/NotificationPreference.js";

export const getPreferences = async (req, res) => {
  let preferences = await NotificationPreference.findOne({
    userId: req.user.id,
  });

  if (!preferences) {
    preferences = await NotificationPreference.create({
      userId: req.user.id,
    });
  }

  res.json({
    success: true,
    data: preferences,
  });
};

export const updatePreferences = async (req, res) => {
  const preferences = await NotificationPreference.findOneAndUpdate(
    { userId: req.user.id },
    { $set: req.body },
    {
      upsert: true,
      new: true,
    }
  );

  res.json({
    success: true,
    data: preferences,
  });
};