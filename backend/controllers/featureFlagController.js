import {
  createOrUpdateFeatureFlag,
  listFeatureFlags,
} from "../services/featureFlagService.js";

export const getFeatureFlags = async (req, res) => {
  try {
    const flags = await listFeatureFlags();

    return res.json({
      success: true,
      data: flags,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const saveFeatureFlag = async (req, res) => {
  try {
    const flag =
      await createOrUpdateFeatureFlag(req.body);

    return res.json({
      success: true,
      data: flag,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};