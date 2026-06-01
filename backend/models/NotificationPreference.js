import mongoose from "mongoose";

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    filingReminders: {
      type: Boolean,
      default: true,
    },
    aiInsights: {
      type: Boolean,
      default: true,
    },
    securityAlerts: {
      type: Boolean,
      default: true,
    },
    productUpdates: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const NotificationPreference =
  mongoose.models.NotificationPreference ||
  mongoose.model("NotificationPreference", notificationPreferenceSchema);

export default NotificationPreference;