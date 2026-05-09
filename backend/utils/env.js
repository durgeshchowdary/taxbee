const requiredEnv = ["MONGO_URI", "JWT_SECRET"];
const optionalEnv = ["CLIENT_ORIGIN", "GEMINI_API_KEY", "EMAIL_USER", "EMAIL_PASS"];

export const validateEnv = () => {
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    required: requiredEnv,
    configuredOptional: optionalEnv.filter((key) => Boolean(process.env[key])),
  };
};

export const getAllowedOrigins = () => {
  const configured = process.env.CLIENT_ORIGIN || "http://localhost:3000";
  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};
