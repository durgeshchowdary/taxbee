import {
  createWebhook,
  getWebhooks,
  disableWebhook,
  updateWebhook,
} from "../services/webhookService.js";
import {
  triggerWebhook,
} from "../services/webhookService.js";
import {
  testWebhookSchema,
  validateWebhookPayload,
} from "../validation/webhookValidation.js";

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
    return res.status(error.status || 400).json({
      success: false,
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
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
    return res.status(error.status || 500).json({
      success: false,
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
    });
  }
};
export const testWebhook = async (
  req,
  res
) => {
  try {
    const validated = validateWebhookPayload(testWebhookSchema, req.body);
    const result =
      await triggerWebhook(
        validated.event,
        validated.payload || {},
        { userId: req.user?.id || req.user?._id }
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

export const update = async (req, res) => {
  try {
    const webhook = await updateWebhook(
      req.params.id,
      req.user?.id || req.user?._id,
      req.body
    );

    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: "Webhook not found",
      });
    }

    return res.json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    return res.status(error.status || 400).json({
      success: false,
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
    });
  }
};

export const disable = async (req, res) => {
  try {
    const webhook = await disableWebhook(
      req.params.id,
      req.user?.id || req.user?._id
    );

    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: "Webhook not found",
      });
    }

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
