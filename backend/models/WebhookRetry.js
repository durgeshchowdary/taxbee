import mongoose from "mongoose";

const WebhookRetrySchema = new mongoose.Schema(
  {
    webhookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Webhook",
      required: true,
      index: true,
    },

    event: {
      type: String,
      required: true,
      index: true,
    },

    payload: {
      type: Object,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    maxAttempts: {
      type: Number,
      default: 5,
    },

    nextRetryAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      index: true,
    },

    lastError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

WebhookRetrySchema.index({
  status: 1,
  nextRetryAt: 1,
});

const WebhookRetry =
  mongoose.models.WebhookRetry ||
  mongoose.model("WebhookRetry", WebhookRetrySchema);

export default WebhookRetry;