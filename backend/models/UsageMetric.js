import mongoose from "mongoose";

const UsageMetricSchema = new mongoose.Schema(
  {
    metric: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    value: {
      type: Number,
      default: 1,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

UsageMetricSchema.index({
  metric: 1,
  createdAt: -1,
});

const UsageMetric =
  mongoose.models.UsageMetric ||
  mongoose.model(
    "UsageMetric",
    UsageMetricSchema
  );

export default UsageMetric;