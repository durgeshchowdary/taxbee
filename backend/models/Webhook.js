import mongoose from "mongoose";
import { encryptWebhookSecret, isEncryptedWebhookSecret } from "../services/webhookSignatureService.js";

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

    events: [
      {
        type: String,
        required: true,
      },
    ],

    event: {
      type: String,
      select: false,
      default: undefined,
    },

    secret: {
      type: String,
      required: true,
      select: false,
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

WebhookSchema.index({
  events: 1,
  status: 1,
});

WebhookSchema.index({
  event: 1,
  status: 1,
});

WebhookSchema.pre("validate", function encryptSecret() {
  if (this.isModified("secret") && this.secret && !isEncryptedWebhookSecret(this.secret)) {
    this.secret = encryptWebhookSecret(this.secret);
  }
});

const Webhook =
  mongoose.models.Webhook ||
  mongoose.model("Webhook", WebhookSchema);

export default Webhook;
