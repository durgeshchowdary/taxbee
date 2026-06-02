import mongoose from "mongoose";

const FeatureFlagSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    enabled: {
      type: Boolean,
      default: false,
      index: true,
    },

    rolloutPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    allowedRoles: {
      type: [String],
      default: [],
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const FeatureFlag =
  mongoose.models.FeatureFlag ||
  mongoose.model("FeatureFlag", FeatureFlagSchema);

export default FeatureFlag;