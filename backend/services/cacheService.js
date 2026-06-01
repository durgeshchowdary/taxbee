import Redis from "ioredis";

let redis = null;
const memoryCache = new Map();

export const getRedis = () => {
  if (
    process.env.REDIS_DISABLED === "true" ||
    process.env.NODE_ENV === "test"
  ) {
    return null;
  }

  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
  }

  return redis;
};

export const getCache = async (key) => {
  const client = getRedis();

  if (!client) {
    const cached = memoryCache.get(key);

    if (!cached) return null;

    if (cached.expiresAt && cached.expiresAt <= Date.now()) {
      memoryCache.delete(key);
      return null;
    }

    return cached.value;
  }

  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
};

export const setCache = async (key, value, ttlSeconds = 300) => {
  const client = getRedis();

  if (!client) {
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    return true;
  }

  await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  return true;
};

export const deleteCache = async (key) => {
  const client = getRedis();

  if (!client) {
    memoryCache.delete(key);
    return true;
  }

  await client.del(key);
  return true;
};

export const clearCache = async () => {
  const client = getRedis();

  if (!client) {
    memoryCache.clear();
    return true;
  }

  await client.flushdb();
  return true;
};

export default {
  getCache,
  setCache,
  deleteCache,
  clearCache,
};