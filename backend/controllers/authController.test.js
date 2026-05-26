import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/user.js";
import WorkspaceAccess from "../models/WorkspaceAccess.js";
import { buildSessionPayload, login, logout, resendVerificationOtp, session, signup } from "./authController.js";

const USER_ID = new mongoose.Types.ObjectId("507f1f77bcf86cd799439081");

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

const chainLean = (value) => ({
  lean: async () => value,
});

test("session payload returns role, verification state, and taxpayer portal", async () => {
  const originalExists = WorkspaceAccess.exists;
  try {
    WorkspaceAccess.exists = async () => null;

    const payload = await buildSessionPayload({
      _id: USER_ID,
      name: "Taxpayer",
      email: "taxpayer@example.com",
      role: "taxpayer",
      isVerified: true,
    });

    assert.equal(payload.role, "taxpayer");
    assert.equal(payload.isVerified, true);
    assert.deepEqual(payload.allowedPortals, ["taxpayer"]);
    assert.equal(payload.defaultPortal, "taxpayer");
  } finally {
    WorkspaceAccess.exists = originalExists;
  }
});

test("session payload gives reviewer portal to accepted reviewer access", async () => {
  const originalExists = WorkspaceAccess.exists;
  try {
    WorkspaceAccess.exists = async () => ({ _id: new mongoose.Types.ObjectId() });

    const payload = await buildSessionPayload({
      _id: USER_ID,
      name: "Taxpayer Reviewer",
      email: "reviewer@example.com",
      role: "taxpayer",
      isVerified: true,
    });

    assert.deepEqual(payload.allowedPortals.sort(), ["reviewer", "taxpayer"]);
    assert.equal(payload.defaultPortal, "reviewer");
  } finally {
    WorkspaceAccess.exists = originalExists;
  }
});

test("session endpoint restores authenticated user from Mongo", async () => {
  const originals = {
    findById: User.findById,
    exists: WorkspaceAccess.exists,
  };
  try {
    User.findById = () =>
      chainLean({
        _id: USER_ID,
        name: "Session User",
        email: "session@example.com",
        role: "ca",
        isVerified: true,
      });
    WorkspaceAccess.exists = async () => null;
    const res = mockResponse();

    await session({ user: { id: String(USER_ID) } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.role, "ca");
    assert.deepEqual(res.body.data.allowedPortals, ["reviewer"]);
  } finally {
    User.findById = originals.findById;
    WorkspaceAccess.exists = originals.exists;
  }
});

test("login returns session metadata and JWT for cookie proxy", async () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  const originals = {
    findOne: User.findOne,
    compare: bcrypt.compare,
    exists: WorkspaceAccess.exists,
  };
  try {
    User.findOne = async () => ({
      _id: USER_ID,
      name: "Login User",
      email: "login@example.com",
      password: "hashed",
      role: "taxpayer",
      isVerified: true,
    });
    bcrypt.compare = async () => true;
    WorkspaceAccess.exists = async () => null;
    const res = mockResponse();

    await login({ body: { email: "login@example.com", password: "password123" }, requestId: "req-login" }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(typeof res.body.token, "string");
    assert.equal(res.body.data.role, "taxpayer");
    assert.deepEqual(res.body.data.allowedPortals, ["taxpayer"]);
  } finally {
    User.findOne = originals.findOne;
    bcrypt.compare = originals.compare;
    WorkspaceAccess.exists = originals.exists;
  }
});

test("verified user login does not require email verification", async () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  const originals = {
    findOne: User.findOne,
    compare: bcrypt.compare,
    exists: WorkspaceAccess.exists,
  };
  try {
    User.findOne = async () => ({
      _id: USER_ID,
      name: "Verified User",
      email: "verified@example.com",
      password: "hashed",
      role: "taxpayer",
      isVerified: true,
    });
    bcrypt.compare = async () => true;
    WorkspaceAccess.exists = async () => null;
    const res = mockResponse();

    await login({ body: { email: "verified@example.com", password: "password123" }, requestId: "req-verified" }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.requiresVerification, false);
    assert.equal(res.body.data.defaultPortal, "taxpayer");
    assert.equal(typeof res.body.token, "string");
  } finally {
    User.findOne = originals.findOne;
    bcrypt.compare = originals.compare;
    WorkspaceAccess.exists = originals.exists;
  }
});

test("legacy isVerified true user logs in even when alias fields disagree", async () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  const originals = {
    findOne: User.findOne,
    compare: bcrypt.compare,
    exists: WorkspaceAccess.exists,
  };
  try {
    User.findOne = async () => ({
      _id: USER_ID,
      name: "Legacy Verified User",
      email: "legacy-verified@example.com",
      password: "hashed",
      role: "taxpayer",
      isVerified: true,
      isEmailVerified: false,
      emailVerified: false,
    });
    bcrypt.compare = async () => true;
    WorkspaceAccess.exists = async () => null;
    const res = mockResponse();

    await login({ body: { email: "legacy-verified@example.com", password: "password123" }, requestId: "req-legacy-verified" }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.requiresVerification, false);
    assert.equal(res.body.data.user.isVerified, true);
    assert.equal(res.body.data.user.isEmailVerified, true);
    assert.equal(typeof res.body.token, "string");
  } finally {
    User.findOne = originals.findOne;
    bcrypt.compare = originals.compare;
    WorkspaceAccess.exists = originals.exists;
  }
});

test("alias-only verification fields do not bypass canonical isVerified false", async () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  process.env.NODE_ENV = "development";
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  const originals = {
    findOne: User.findOne,
    compare: bcrypt.compare,
  };
  try {
    const user = {
      _id: USER_ID,
      name: "Alias Only User",
      email: "alias-only@example.com",
      password: "hashed",
      role: "taxpayer",
      isVerified: false,
      isEmailVerified: true,
      emailVerified: true,
      save: async function save() {
        return this;
      },
    };
    User.findOne = async () => user;
    bcrypt.compare = async () => true;
    const res = mockResponse();

    await login({ body: { email: "alias-only@example.com", password: "password123" }, requestId: "req-alias-only" }, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.requiresVerification, true);
    assert.equal(res.body.token, undefined);
  } finally {
    process.env.NODE_ENV = "test";
    User.findOne = originals.findOne;
    bcrypt.compare = originals.compare;
  }
});

test("unverified user login resends OTP and does not issue workspace token", async () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  process.env.NODE_ENV = "development";
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  const originals = {
    findOne: User.findOne,
    compare: bcrypt.compare,
  };
  try {
    const user = {
      _id: USER_ID,
      name: "Unverified User",
      email: "pending@example.com",
      password: "hashed",
      role: "taxpayer",
      isVerified: false,
      saveCalls: 0,
      save: async function save() {
        this.saveCalls += 1;
        return this;
      },
    };
    User.findOne = async () => user;
    bcrypt.compare = async () => true;
    const res = mockResponse();

    await login({ body: { email: "pending@example.com", password: "password123" }, requestId: "req-unverified" }, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.requiresVerification, true);
    assert.equal(res.body.token, undefined);
    assert.equal(user.saveCalls, 1);
    assert.equal(typeof user.otpHash, "string");
    assert.equal(typeof res.body.devOtp, "string");
  } finally {
    User.findOne = originals.findOne;
    bcrypt.compare = originals.compare;
  }
});

test("signup creates unverified user and sends verification OTP", async () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  process.env.NODE_ENV = "development";
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  const originals = {
    findOne: User.findOne,
    create: User.create,
  };
  try {
    const user = {
      _id: USER_ID,
      name: "Signup User",
      email: "signup@example.com",
      role: "taxpayer",
      isVerified: false,
      saveCalls: 0,
      save: async function save() {
        this.saveCalls += 1;
        return this;
      },
    };
    User.findOne = async () => null;
    User.create = async (payload) => {
      assert.equal(payload.isVerified, false);
      return user;
    };
    const res = mockResponse();

    await signup({ body: { name: "Signup User", email: "signup@example.com", password: "password123" }, requestId: "req-signup" }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.requiresVerification, true);
    assert.equal(user.saveCalls, 1);
    assert.equal(typeof user.otpHash, "string");
    assert.equal(typeof res.body.devOtp, "string");
  } finally {
    User.findOne = originals.findOne;
    User.create = originals.create;
  }
});

test("resend verification OTP works for unverified users", async () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  process.env.NODE_ENV = "development";
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  const originalFindOne = User.findOne;
  try {
    const user = {
      _id: USER_ID,
      email: "pending@example.com",
      isVerified: false,
      saveCalls: 0,
      save: async function save() {
        this.saveCalls += 1;
        return this;
      },
    };
    User.findOne = () => ({
      select: async () => user,
    });
    const res = mockResponse();

    await resendVerificationOtp({ body: { email: "pending@example.com" }, requestId: "req-resend" }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.requiresVerification, true);
    assert.equal(user.saveCalls, 1);
    assert.equal(typeof res.body.devOtp, "string");
  } finally {
    User.findOne = originalFindOne;
  }
});

test("missing email provider returns dev fallback but production never exposes OTP", async () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  const originalFindOne = User.findOne;
  try {
    const user = {
      _id: USER_ID,
      email: "pending@example.com",
      isVerified: false,
      save: async function save() {
        return this;
      },
    };
    User.findOne = () => ({
      select: async () => user,
    });

    process.env.NODE_ENV = "development";
    const devRes = mockResponse();
    await resendVerificationOtp({ body: { email: "pending@example.com" }, requestId: "req-dev-resend" }, devRes);
    assert.equal(typeof devRes.body.devOtp, "string");
    assert.match(devRes.body.data.emailDelivery.message, /Development OTP/);

    process.env.NODE_ENV = "production";
    const prodRes = mockResponse();
    await resendVerificationOtp({ body: { email: "pending@example.com" }, requestId: "req-prod-resend" }, prodRes);
    assert.equal(prodRes.body.devOtp, undefined);
    assert.equal(prodRes.body.data.devOtp, undefined);
    assert.match(prodRes.body.data.emailDelivery.message, /email provider is not configured/i);
  } finally {
    process.env.NODE_ENV = "test";
    User.findOne = originalFindOne;
  }
});

test("logout endpoint returns success for cookie-clearing proxy", async () => {
  const res = mockResponse();

  await logout({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});
