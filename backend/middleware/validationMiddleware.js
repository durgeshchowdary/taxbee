import { fail } from "../utils/apiResponse.js";
import { hasUnsafeMongoKey, sanitizePlainObject } from "../utils/mongoSafety.js";

const MAX_STRING_LENGTH = 10_000;

const sanitizeString = (value, maxLength = MAX_STRING_LENGTH) =>
  String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);

export const sanitizeText = sanitizeString;

export const sanitizeRequestInput = (req, res, next) => {
  if (hasUnsafeMongoKey(req.body) || hasUnsafeMongoKey(req.query) || hasUnsafeMongoKey(req.params)) {
    return fail(res, {
      status: 400,
      message: "Request contains unsupported query operators",
      code: "UNSAFE_INPUT",
    });
  }

  if (req.body && typeof req.body === "object") req.body = sanitizePlainObject(req.body);
  return next();
};

const validators = {
  string(value, rule = {}) {
    const text = sanitizeString(value, rule.max || MAX_STRING_LENGTH);
    if (rule.required && !text) return { error: `${rule.label} is required` };
    if (rule.email && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      return { error: `${rule.label} must be a valid email address` };
    }
    if (rule.pattern && text && !rule.pattern.test(text)) {
      return { error: `${rule.label} is invalid` };
    }
    return { value: text };
  },
  enum(value, rule = {}) {
    const text = sanitizeString(value, rule.max || 100);
    if (rule.required && !text) return { error: `${rule.label} is required` };
    if (text && !rule.values.includes(text)) return { error: `${rule.label} is invalid` };
    return { value: text || rule.default };
  },
  number(value, rule = {}) {
    const number = Number(value);
    if (rule.required && !Number.isFinite(number)) return { error: `${rule.label} is required` };
    if (!Number.isFinite(number)) return { value: rule.default ?? 0 };
    if (Number.isFinite(rule.min) && number < rule.min) return { error: `${rule.label} is too small` };
    if (Number.isFinite(rule.max) && number > rule.max) return { error: `${rule.label} is too large` };
    return { value: number };
  },
  boolean(value) {
    return { value: Boolean(value) };
  },
  object(value, rule = {}) {
    if (rule.required && (!value || typeof value !== "object" || Array.isArray(value))) {
      return { error: `${rule.label} is required` };
    }
    return { value: sanitizePlainObject(value && typeof value === "object" && !Array.isArray(value) ? value : {}) };
  },
  array(value, rule = {}) {
    if (rule.required && !Array.isArray(value)) return { error: `${rule.label} is required` };
    const items = Array.isArray(value) ? value.slice(0, rule.maxItems || 200) : [];
    return { value: items.map((item) => sanitizePlainObject(item)) };
  },
};

export const validateBody = (schema) => (req, res, next) => {
  const source = req.body || {};
  const output = {};

  for (const [field, rule] of Object.entries(schema)) {
    const validator = validators[rule.type || "string"];
    const result = validator(source[field], { ...rule, label: rule.label || field });
    if (result.error) {
      return fail(res, { status: 400, message: result.error, code: "VALIDATION_ERROR" });
    }
    if (result.value !== undefined || Object.hasOwn(source, field)) output[field] = result.value;
  }

  req.body = output;
  return next();
};

export const validateUploadBody = validateBody({
  fileName: { type: "string", required: true, max: 180 },
  mimeType: { type: "string", max: 120 },
  text: { type: "string", max: 1_000_000 },
  fileBase64: { type: "string", max: 8_500_000 },
  sizeBytes: { type: "number", min: 0, max: 8_000_000 },
});
