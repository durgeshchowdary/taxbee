import assert from "node:assert/strict";
import test from "node:test";
import {
  getAllowedOrigins,
  getJwtAudience,
  getJwtIssuer,
  getMongoUri,
  getOcrProvider,
  validateEnv,
} from "./env.js";

const snapshotEnv = () => ({ ...process.env });
const restoreEnv = (snapshot) => {
  process.env = snapshot;
};

test("deployment env accepts MONGODB_URI and JWT issuer/audience overrides", () => {
  const env = snapshotEnv();
  process.env = {
    ...env,
    MONGODB_URI: "mongodb+srv://user:pass@example.mongodb.net/taxbee",
    JWT_SECRET: "a-production-grade-secret-with-32-chars",
    JWT_ISSUER: "issuer-prod",
    JWT_AUDIENCE: "audience-prod",
    CORS_ORIGIN: "https://app.taxbee.example",
    METRICS_TOKEN: "a-production-metrics-token-with-32-chars",
    NODE_ENV: "production",
  };

  try {
    assert.equal(getMongoUri(), process.env.MONGODB_URI);
    assert.equal(getJwtIssuer(), "issuer-prod");
    assert.equal(getJwtAudience(), "audience-prod");
    assert.deepEqual(getAllowedOrigins(), ["https://app.taxbee.example"]);
    assert.doesNotThrow(() => validateEnv());
  } finally {
    restoreEnv(env);
  }
});

test("OCR_PROVIDER validation accepts known providers and rejects unknown values", () => {
  const env = snapshotEnv();
  process.env = {
    ...env,
    MONGODB_URI: "mongodb://127.0.0.1:27017/taxbee",
    JWT_SECRET: "a-development-secret-with-32-characters",
    NODE_ENV: "development",
    OCR_PROVIDER: "tesseract",
  };

  try {
    assert.equal(getOcrProvider(), "tesseract");
    assert.doesNotThrow(() => validateEnv());

    process.env.OCR_PROVIDER = "surprise";
    assert.throws(() => validateEnv(), /OCR_PROVIDER/);
  } finally {
    restoreEnv(env);
  }
});

test("development CORS keeps localhost while production requires explicit origins", () => {
  const env = snapshotEnv();
  process.env = {
    ...env,
    MONGODB_URI: "mongodb://127.0.0.1:27017/taxbee",
    JWT_SECRET: "a-development-secret-with-32-characters",
    NODE_ENV: "development",
  };

  try {
    assert.ok(getAllowedOrigins().includes("http://localhost:3000"));
    assert.ok(getAllowedOrigins().includes("http://127.0.0.1:3000"));

    process.env.NODE_ENV = "production";
    assert.throws(() => validateEnv(), /CORS_ORIGIN is required/);
  } finally {
    restoreEnv(env);
  }
});
