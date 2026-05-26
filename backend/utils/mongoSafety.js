import mongoose from "mongoose";

const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export const isValidObjectId = (value) =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

export const requireObjectId = (value, fieldName = "id") => {
  if (!isValidObjectId(String(value || ""))) {
    const error = new Error(`${fieldName} must be a valid id`);
    error.status = 400;
    error.code = "INVALID_ID";
    throw error;
  }
  return String(value);
};

export const hasUnsafeMongoKey = (value) => {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasUnsafeMongoKey);

  return Object.entries(value).some(([key, child]) => {
    if (DANGEROUS_KEYS.has(key) || key.startsWith("$")) return true;
    return hasUnsafeMongoKey(child);
  });
};

export const sanitizePlainObject = (value, depth = 0) => {
  if (depth > 12) return null;
  if (Array.isArray(value)) return value.map((item) => sanitizePlainObject(item, depth + 1));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !DANGEROUS_KEYS.has(key) && !key.startsWith("$"))
      .map(([key, child]) => [key, sanitizePlainObject(child, depth + 1)])
  );
};
