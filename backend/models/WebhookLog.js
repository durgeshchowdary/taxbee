import mongoose from "mongoose";

const WebhookLogSchema = new mongoose.Schema(
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

    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
      index: true,
    },

    responseCode: Number,

    errorMessage: String,

    deliveredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

WebhookLogSchema.index({
  webhookId: 1,
  deliveredAt: -1,
});

const WebhookLog =
  mongoose.models.WebhookLog ||
  mongoose.model(
    "WebhookLog",
    WebhookLogSchema
  );

export default WebhookLog;