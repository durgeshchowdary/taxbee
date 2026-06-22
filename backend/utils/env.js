const optionalEnv = [
  "APP_VERSION",
  "BACKEND_URL",
  "CLIENT_ORIGIN",
  "CORS_ORIGIN",
  "GEMINI_API_KEY",
  "JWT_AUDIENCE",
  "JWT_ISSUER",
  "METRICS_TOKEN",
  "NODE_ENV",
  "OCR_MAX_IMAGE_BYTES",
  "OCR_MAX_PDF_PAGES",
  "OCR_PDF_RENDER_SCALE",
  "OCR_PROVIDER",
  "OCR_TIMEOUT_MS",
  "WORKER_ID",
  "WORKER_POLL_INTERVAL_MS",
  "WORKER_JOB_TIMEOUT_MS",
  "EMAIL_USER",
  "EMAIL_PASS",
  "WEBHOOK_SECRET_ENCRYPTION_KEY",
  "WEBHOOK_SSRF_DNS_LOOKUP",

  // Sprint 3 queue config
  "QUEUE_BACKEND",
  "REDIS_URL",
  "BULLMQ_PREFIX",
];

const requiredEnv = ["JWT_SECRET"];

const weakJwtSecrets = new Set([
  "secret",
  "mysecret",
  "mysecretkey",
  "mysecretkey123",
  "changeme",
]);

const validateOrigin = (origin) => {
  try {
    const url = new URL(origin);
    return ["http:", "https:"].includes(url.protocol) && !origin.includes("*");
  } catch {
    return false;
  }
};

export const getMongoUri = () => process.env.MONGODB_URI || process.env.MONGO_URI;

export const getAllowedOrigins = () => {
  const configured = process.env.CORS_ORIGIN || process.env.CLIENT_ORIGIN || "";
  const devOrigins =
    process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:3000", "http://127.0.0.1:3000"];

  return [...configured.split(","), ...devOrigins]
    .map((origin) => origin.trim())
    .filter(Boolean)
    .filter((origin, index, origins) => origins.indexOf(origin) === index);
};

export const getJwtIssuer = () => process.env.JWT_ISSUER || "taxbee-api";

export const getJwtAudience = () => process.env.JWT_AUDIENCE || "taxbee-web";

export const getOcrProvider = () =>
  String(process.env.OCR_PROVIDER || "none").trim().toLowerCase();

export const getQueueBackend = () =>
  String(process.env.QUEUE_BACKEND || "mongo").trim().toLowerCase();

export const getRedisUrl = () =>
  process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const getBullMqPrefix = () =>
  process.env.BULLMQ_PREFIX || "taxbee";

export const validateEnv = () => {
  const mongoUri = getMongoUri();
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (!mongoUri) {
    missing.push("MONGODB_URI");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (
    String(process.env.JWT_SECRET).length < 32 ||
    weakJwtSecrets.has(String(process.env.JWT_SECRET))
  ) {
    throw new Error("JWT_SECRET must be a high-entropy secret with at least 32 characters");
  }

  if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
    throw new Error("MONGODB_URI must be a valid MongoDB connection string");
  }

  const invalidOrigins = getAllowedOrigins().filter((origin) => !validateOrigin(origin));
  if (invalidOrigins.length > 0) {
    throw new Error(`CORS_ORIGIN contains invalid origins: ${invalidOrigins.join(", ")}`);
  }

  const ocrProvider = getOcrProvider();
  if (!["none", "tesseract", "managed"].includes(ocrProvider)) {
    throw new Error("OCR_PROVIDER must be one of: none, tesseract, managed");
  }

  const queueBackend = getQueueBackend();
  if (!["mongo", "bullmq"].includes(queueBackend)) {
    throw new Error("QUEUE_BACKEND must be one of: mongo, bullmq");
  }

  if (
    queueBackend === "bullmq" &&
    !process.env.REDIS_URL &&
    process.env.NODE_ENV === "production"
  ) {
    throw new Error("REDIS_URL is required in production when QUEUE_BACKEND=bullmq");
  }

  if (process.env.NODE_ENV === "production") {
    if (!process.env.CORS_ORIGIN && !process.env.CLIENT_ORIGIN) {
      throw new Error("CORS_ORIGIN is required in production");
    }

    if (!process.env.JWT_ISSUER || !process.env.JWT_AUDIENCE) {
      throw new Error("JWT_ISSUER and JWT_AUDIENCE are required in production");
    }

    if (!process.env.METRICS_TOKEN || String(process.env.METRICS_TOKEN).length < 32) {
      throw new Error("METRICS_TOKEN must be set to at least 32 characters in production");
    }
  }

  return {
    required: [...requiredEnv, "MONGODB_URI"],
    configuredOptional: optionalEnv.filter((key) => Boolean(process.env[key])),
  };
};
