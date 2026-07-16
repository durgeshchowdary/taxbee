const SECRET_PATTERNS = [
  /authorization/i,
  /cookie/i,
  /token/i,
  /secret/i,
  /password/i,
  /otp/i,
  /api[_-]?key/i,
  /email_pass/i,
  /fileBase64/i,
  /rawText/i,
  /extractedText/i,
  /documentText/i,
  /aadhaar/i,
  /aadhar/i,
  /pan/i,
];

const MAX_LOG_STRING = 300;

const PAN_PATTERN = /\b[A-Z]{5}\d{4}[A-Z]\b/gi;
const AADHAAR_PATTERN = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const INDIAN_PHONE_PATTERN = /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g;
const LONG_NUMBER_PATTERN = /\b\d[\d,\s]{5,}(?:\.\d{1,2})?\b/g;

const maskEmail = (email) => {
  const [name, domain] = String(email).split("@");
  if (!name || !domain) return "[REDACTED_EMAIL]";
  return `${name.slice(0, 2)}***@${domain}`;
};

const maskPhone = (phone) => {
  const value = String(phone);
  return `${value.slice(0, 2)}******${value.slice(-2)}`;
};

const redact = (value, key = "") => {
  if (SECRET_PATTERNS.some((pattern) => pattern.test(key))) return "[REDACTED]";

  if (typeof value === "string") {
    const cleaned = value
      .replace(PAN_PATTERN, "[REDACTED_PAN]")
      .replace(AADHAAR_PATTERN, "[REDACTED_AADHAAR]")
      .replace(EMAIL_PATTERN, maskEmail)
      .replace(INDIAN_PHONE_PATTERN, maskPhone)
      .replace(LONG_NUMBER_PATTERN, "[REDACTED_NUMBER]");

    return cleaned.length > MAX_LOG_STRING
      ? `${cleaned.slice(0, MAX_LOG_STRING)}...`
      : cleaned;
  }

  if (typeof value === "number" && Math.abs(value) >= 100000) {
    return "[REDACTED_NUMBER]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redact(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 30)
        .map(([childKey, childValue]) => [childKey, redact(childValue, childKey)])
    );
  }

  return value;
};

const normalizeError = (error) => ({
  name: error?.name,
  message: redact(error?.message || ""),
  code: error?.code,
  status: error?.status || error?.statusCode,
  stack: process.env.NODE_ENV === "production" ? undefined : redact(error?.stack || ""),
});

const write = (level, message, context = {}, error = null) => {
  const event = {
    timestamp: new Date().toISOString(),
    level,
    service: "taxbee-backend",
    message,
    ...(error ? { error: normalizeError(error) } : {}),
    ...redact(context),
  };

  const line = JSON.stringify(event);

  if (level === "error") return console.error(line);
  if (level === "warn") return console.warn(line);

  return console.log(line);
};

export const logger = {
  info(message, context = {}) {
    write("info", message, context);
  },
  warn(message, context = {}) {
    write("warn", message, context);
  },
  error(message, error, context = {}) {
    write("error", message, context, error);
  },
  redact,
};