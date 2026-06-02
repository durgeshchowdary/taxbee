import mongoose from "mongoose";

const WebhookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    event: {
      type: String,
      required: true,
      index: true,
    },

    secret: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      index: true,
    },

    lastTriggeredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

WebhookSchema.index({
  userId: 1,
  status: 1,
  createdAt: -1,
});

const Webhook =
  mongoose.models.Webhook ||
  mongoose.model("Webhook", WebhookSchema);

export default Webhook;