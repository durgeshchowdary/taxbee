import assert from "node:assert/strict";
import test from "node:test";
import { getHealth, getReady } from "./healthController.js";

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

test("getHealth reports app, DB, uptime, environment, and version fields", () => {
  const res = mockResponse();

  getHealth({}, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.data.app, "taxbee-backend");
  assert.equal(res.body.data.database, "disconnected");
  assert.equal(typeof res.body.data.uptimeSeconds, "number");
  assert.equal(typeof res.body.data.environment, "string");
  assert.equal(typeof res.body.data.version, "string");
});

test("getReady reports readiness components without leaking secrets", async () => {
  const res = mockResponse();

  await getReady({}, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.data.database.ready, false);
  assert.equal(typeof res.body.data.env.ready, "boolean");
  assert.equal(res.body.data.queue.backend, "mongo");
});
