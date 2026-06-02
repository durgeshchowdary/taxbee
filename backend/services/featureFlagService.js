import FeatureFlag from "../models/FeatureFlag.js";

export const createOrUpdateFeatureFlag = async ({
  key,
  name,
  description = "",
  enabled = false,
  rolloutPercentage = 0,
  allowedRoles = [],
  metadata = {},
}) => {
  if (!key || !name) {
    throw new Error("Feature flag key and name are required");
  }

  const flag = await FeatureFlag.findOneAndUpdate(
    { key: key.toLowerCase().trim() },
    {
      key: key.toLowerCase().trim(),
      name,
      description,
      enabled,
      rolloutPercentage,
      allowedRoles,
      metadata,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  return flag;
};

export const getFeatureFlag = async (key) => {
  const flag = await FeatureFlag.findOne({
    key: key.toLowerCase().trim(),
  }).lean();

  return flag;
};

export const listFeatureFlags = async () => {
  return FeatureFlag.find({}).sort({ key: 1 }).lean();
};

export const isFeatureEnabled = async ({
  key,
  userId = "",
  role = "",
}) => {
  const flag = await getFeatureFlag(key);

  if (!flag || !flag.enabled) {
    return false;
  }

  if (
    Array.isArray(flag.allowedRoles) &&
    flag.allowedRoles.length > 0 &&
    !flag.allowedRoles.includes(role)
  ) {
    return false;
  }

  if (flag.rolloutPercentage >= 100) {
    return true;
  }

  if (flag.rolloutPercentage <= 0) {
    return false;
  }

  const seed = String(userId || role || key);
  const bucket =
    seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100;

  return bucket < flag.rolloutPercentage;
};

export default {
  createOrUpdateFeatureFlag,
  getFeatureFlag,
  listFeatureFlags,
  isFeatureEnabled,
};