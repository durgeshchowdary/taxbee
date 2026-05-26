import assert from "node:assert/strict";
import test from "node:test";
import { authRateLimit, rateLimit, securityHeaders } from "./securityMiddleware.js";

const mockResponse = () => {
  const headers = {};
  return {
    statusCode: 200,
    body: null,
    setHeader(key, value) {
      headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    headers,
  };
};

test("rateLimit blocks requests above the configured budget", () => {
  const limiter = rateLimit({ name: `test-${Date.now()}`, windowMs: 60_000, max: 2 });
  const req = { ip: "127.0.0.10" };
  const first = mockResponse();
  const second = mockResponse();
  const third = mockResponse();

  limiter(req, first, () => {});
  limiter(req, second, () => {});
  limiter(req, third, () => {});

  assert.equal(third.statusCode, 429);
  assert.equal(third.body.code, "RATE_LIMITED");
});

test("development authRateLimit allows repeated localhost testing", () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "development";
    const req = { ip: `127.0.0.${Date.now()}`, originalUrl: "/api/auth/login" };

    for (let index = 0; index < 100; index += 1) {
      const res = mockResponse();
      authRateLimit(req, res, () => {});
      assert.notEqual(res.statusCode, 429);
    }
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test("securityHeaders applies browser hardening headers", () => {
  const res = mockResponse();
  let nextCalled = false;

  securityHeaders({}, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.headers["X-Content-Type-Options"], "nosniff");
  assert.equal(res.headers["X-Frame-Options"], "DENY");
  assert.match(res.headers["Content-Security-Policy"], /frame-ancestors 'none'/);
});
