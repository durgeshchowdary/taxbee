import crypto from "crypto";
import ApiKey from "../models/ApiKey.js";

const hashKey = (key) =>
  crypto
    .createHash("sha256")
    .update(key)
    .digest("hex");

export const createApiKey = async (
  userId,
  name
) => {
  const rawKey =
    "tb_" +
    crypto.randomBytes(32).toString("hex");

  const keyHash = hashKey(rawKey);

  const record = await ApiKey.create({
    userId,
    name,
    keyHash,
  });

  return {
    apiKey: rawKey,
    record,
  };
};

export const getUserApiKeys = async (
  userId
) => {
  return ApiKey.find({
    userId,
  })
    .sort({ createdAt: -1 })
    .lean();
};

export const revokeApiKey = async (
  id,
  userId
) => {
  return ApiKey.findOneAndUpdate(
    {
      _id: id,
      userId,
    },
    {
      status: "revoked",
    },
    {
      new: true,
    }
  );
};

export const rotateApiKey = async (
  id,
  userId
) => {
  const rawKey =
    "tb_" +
    crypto.randomBytes(32).toString("hex");

  const keyHash = hashKey(rawKey);

  const record =
    await ApiKey.findOneAndUpdate(
      {
        _id: id,
        userId,
      },
      {
        keyHash,
        status: "active",
      },
      {
        new: true,
      }
    );

  return {
    apiKey: rawKey,
    record,
  };
};

export default {
  createApiKey,
  getUserApiKeys,
  revokeApiKey,
  rotateApiKey,
};