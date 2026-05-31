import Redis from "ioredis";
import { getRedisUrl } from "../utils/env.js";

let redisClient = null;

export const getRedisClient = () => {
  if (redisClient) return redisClient;

  redisClient = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  return redisClient;
};

export const getCache = async (key) => {
  const value = await getRedisClient().get(key);
  return value ? JSON.parse(value) : null;
};

export const setCache = async (key, value, ttlSeconds = 30) => {
  await getRedisClient().set(key, JSON.stringify(value), "EX", ttlSeconds);
};

export const deleteCache = async (key) => {
  await getRedisClient().del(key);
};

export const clearCache = async () => {
  await getRedisClient().flushdb();
};