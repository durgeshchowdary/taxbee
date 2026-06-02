import {
  createApiKey,
  getUserApiKeys,
  revokeApiKey,
  rotateApiKey,
} from "../services/apiKeyService.js";

export const createKey = async (req, res) => {
  try {
    const result = await createApiKey(
      req.user?.id || req.user?._id,
      req.body.name
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getKeys = async (req, res) => {
  try {
    const keys = await getUserApiKeys(
      req.user?.id || req.user?._id
    );

    return res.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const revokeKey = async (req, res) => {
  try {
    const key = await revokeApiKey(
      req.params.id,
      req.user?.id || req.user?._id
    );

    return res.json({
      success: true,
      data: key,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const rotateKey = async (req, res) => {
  try {
    const result = await rotateApiKey(
      req.params.id,
      req.user?.id || req.user?._id
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};