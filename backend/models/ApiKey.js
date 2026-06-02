import mongoose from "mongoose";

const ApiKeySchema = new mongoose.Schema(
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

    keyHash: {
      type: String,
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
      index: true,
    },

    lastUsedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ApiKeySchema.index({
  userId: 1,
  status: 1,
  createdAt: -1,
});

const ApiKey =
  mongoose.models.ApiKey ||
  mongoose.model("ApiKey", ApiKeySchema);

export default ApiKey;