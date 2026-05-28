import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { requireAuth } from "./authMiddleware.js";

const mockResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test("requireAuth accepts valid TaxBee JWTs and attaches only safe user identity", () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  const token = jwt.sign({ id: "507f1f77bcf86cd799439011", role: "admin" }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: "taxbee-api",
    audience: "taxbee-web",
  });
  const req = {
    requestId: "req-auth-ok",
    originalUrl: "/api/dashboard",
    get: (name) => (name.toLowerCase() === "authorization" ? `Bearer ${token}` : ""),
  };
  const res = mockResponse();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, { id: "507f1f77bcf86cd799439011", role: "admin", isVerified: undefined });
});

test("requireAuth accepts HttpOnly auth_token cookie when bearer header is absent", () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  const token = jwt.sign({ id: "507f1f77bcf86cd799439012", role: "reviewer", isVerified: true }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: "taxbee-api",
    audience: "taxbee-web",
  });
  const req = {
    requestId: "req-auth-cookie",
    originalUrl: "/api/collaboration/workspaces",
    get: (name) => (name.toLowerCase() === "cookie" ? `auth_token=${encodeURIComponent(token)}` : ""),
  };
  const res = mockResponse();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, { id: "507f1f77bcf86cd799439012", role: "reviewer", isVerified: true });
});

test("requireAuth rejects expired tokens", () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  const token = jwt.sign(
    { id: "507f1f77bcf86cd799439011" },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      issuer: "taxbee-api",
      audience: "taxbee-web",
      expiresIn: -1,
    }
  );
  const req = {
    requestId: "req-auth-expired",
    originalUrl: "/api/dashboard",
    get: (name) => (name.toLowerCase() === "authorization" ? `Bearer ${token}` : ""),
  };
  const res = mockResponse();

  requireAuth(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, "AUTH_INVALID");
});

test("requireAuth rejects explicitly unverified session tokens", () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  const token = jwt.sign({ id: "507f1f77bcf86cd799439011", isVerified: false }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: "taxbee-api",
    audience: "taxbee-web",
  });
  const req = {
    requestId: "req-auth-unverified",
    originalUrl: "/api/dashboard",
    get: (name) => (name.toLowerCase() === "authorization" ? `Bearer ${token}` : ""),
  };
  const res = mockResponse();

  requireAuth(req, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, "EMAIL_VERIFICATION_REQUIRED");
});

test("requireAuth rejects tokens with wrong issuer/audience", () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  const token = jwt.sign({ id: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET);
  const req = {
    requestId: "req-auth-bad",
    originalUrl: "/api/dashboard",
    get: (name) => (name.toLowerCase() === "authorization" ? `Bearer ${token}` : ""),
  };
  const res = mockResponse();

  requireAuth(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, "AUTH_INVALID");
});

test("requireAuth rejects missing authentication with structured diagnostics", () => {
  const req = {
    requestId: "req-auth-missing",
    originalUrl: "/api/itr-draft",
    get: () => "",
  };
  const res = mockResponse();

  requireAuth(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, "AUTH_REQUIRED");
  assert.deepEqual(res.body.data, {
    requestId: "req-auth-missing",
    authenticated: false,
    service: "auth",
  });
});

test("requireAuth treats malformed auth_token cookies as missing authentication", () => {
  const req = {
    requestId: "req-auth-bad-cookie",
    originalUrl: "/api/ai/bee-assistant",
    get: (name) => (name.toLowerCase() === "cookie" ? "auth_token=%E0%A4%A" : ""),
  };
  const res = mockResponse();

  requireAuth(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, "AUTH_REQUIRED");
});
