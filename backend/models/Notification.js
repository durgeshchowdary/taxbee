import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "system",
        "billing",
        "support",
        "backup",
        "tax",
        "security",
      ],
      default: "system",
    },

    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
      index: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({
  userId: 1,
  status: 1,
  createdAt: -1,
});

const Notification =
  mongoose.models.Notification ||
  mongoose.model(
    "Notification",
    NotificationSchema
  );

export default Notification;
