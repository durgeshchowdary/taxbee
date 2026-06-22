import assert from "node:assert/strict";
import test from "node:test";

import {
  requireAnyRole,
  requirePermission,
  requireRole,
} from "./rbacMiddleware.js";

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

test("requireRole allows matching roles", () => {
  const req = { user: { role: "admin" }, get: () => "", originalUrl: "/api/admin-dashboard/stats" };
  const res = mockResponse();
  let nextCalled = false;

  requireRole("admin")(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test("requireAnyRole maps user alias to taxpayer", () => {
  const req = { user: { role: "taxpayer" }, get: () => "", originalUrl: "/api/webhooks" };
  const res = mockResponse();
  let nextCalled = false;

  requireAnyRole("user")(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test("requirePermission denies missing permissions", () => {
  const req = { requestId: "req-rbac", user: { role: "taxpayer" }, method: "GET", originalUrl: "/api/monitoring/metrics" };
  const res = mockResponse();

  requirePermission("analytics:read")(req, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, "RBAC_FORBIDDEN");
});

test("requirePermission allows wildcard admin permissions", () => {
  const req = { user: { role: "admin" }, method: "GET", originalUrl: "/api/monitoring/metrics" };
  const res = mockResponse();
  let nextCalled = false;

  requirePermission("analytics:read")(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});
