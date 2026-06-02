import {
  createWebhook,
  getWebhooks,
  disableWebhook,
} from "../services/webhookService.js";

export const create = async (req, res) => {
  try {
    const webhook = await createWebhook(
      req.user?.id || req.user?._id,
      req.body
    );

    return res.status(201).json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAll = async (req, res) => {
  try {
    const webhooks = await getWebhooks(
      req.user?.id || req.user?._id
    );

    return res.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const disable = async (req, res) => {
  try {
    const webhook = await disableWebhook(
      req.params.id,
      req.user?.id || req.user?._id
    );

    return res.json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};