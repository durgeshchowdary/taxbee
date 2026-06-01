const required = [
  "MONGODB_URI",
  "JWT_SECRET",
  "CORS_ORIGIN"
];

function requireEnv(name) {
  const value = process.env[name];

  if (!value || String(value).trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const NODE_ENV = process.env.NODE_ENV || "development";
const APP_ENV = process.env.APP_ENV || NODE_ENV;

const config = {
  nodeEnv: NODE_ENV,
  appEnv: APP_ENV,
  port: process.env.PORT || 5000,
  mongoUri: requireEnv("MONGODB_URI"),
  jwtSecret: requireEnv("JWT_SECRET"),
  corsOrigin: requireEnv("CORS_ORIGIN"),
  frontendUrl: process.env.FRONTEND_URL || process.env.CORS_ORIGIN,
  redisUrl: process.env.REDIS_URL || "",
  s3Bucket: process.env.S3_BUCKET || "",
  emailFrom: process.env.EMAIL_FROM || "",
};

function printSafeConfig() {
  console.log("TaxBee backend config loaded:", {
    nodeEnv: config.nodeEnv,
    appEnv: config.appEnv,
    port: config.port,
    hasMongoUri: Boolean(config.mongoUri),
    hasJwtSecret: Boolean(config.jwtSecret),
    corsOrigin: config.corsOrigin,
    frontendUrl: config.frontendUrl,
    hasRedisUrl: Boolean(config.redisUrl),
    hasS3Bucket: Boolean(config.s3Bucket),
    hasEmailFrom: Boolean(config.emailFrom),
  });
}

module.exports = {
  config,
  printSafeConfig,
};