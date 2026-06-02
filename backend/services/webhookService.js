import crypto from "crypto";
import Webhook from "../models/Webhook.js";

export const createWebhook = async (
  userId,
  payload
) => {
  const secret =
    crypto.randomBytes(32).toString("hex");

  return Webhook.create({
    userId,
    name: payload.name,
    url: payload.url,
    event: payload.event,
    secret,
  });
};

export const getWebhooks = async (
  userId
) => {
  return Webhook.find({
    userId,
  })
    .sort({ createdAt: -1 })
    .lean();
};

export const disableWebhook = async (
  id,
  userId
) => {
  return Webhook.findOneAndUpdate(
    {
      _id: id,
      userId,
    },
    {
      status: "disabled",
    },
    {
      new: true,
    }
  );
};

export const triggerWebhook = async (
  event,
  data
) => {
  const hooks = await Webhook.find({
    event,
    status: "active",
  });

  console.log(
    `Dispatching ${hooks.length} webhook(s) for ${event}`
  );

  return hooks.length;
};

export default {
  createWebhook,
  getWebhooks,
  disableWebhook,
  triggerWebhook,
};