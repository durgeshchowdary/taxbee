import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeRequestInput, validateBody } from "./validationMiddleware.js";

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

test("sanitizeRequestInput rejects Mongo operator injection keys", () => {
  const req = { body: { email: { $ne: "victim@example.com" } }, query: {}, params: {} };
  const res = mockResponse();
  let nextCalled = false;

  sanitizeRequestInput(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "UNSAFE_INPUT");
});

test("validateBody keeps only declared fields and trims string payloads", () => {
  const middleware = validateBody({
    email: { type: "string", required: true, email: true, max: 254 },
    message: { type: "string", max: 10 },
  });
  const req = {
    body: {
      email: " user@example.com ",
      message: "  hello world  ",
      userId: "attacker",
    },
  };
  const res = mockResponse();

  middleware(req, res, () => {});

  assert.deepEqual(req.body, {
    email: "user@example.com",
    message: "hello worl",
  });
});
