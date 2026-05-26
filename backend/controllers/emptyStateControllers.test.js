import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { getDashboard } from "./dashboardController.js";
import { getTaxSavings } from "./taxSavingsController.js";
import { listImports } from "./importController.js";
import { getAuthenticatedDraft } from "./itrDraftController.js";
import { getDeductions } from "./deductionController.js";
import User from "../models/user.js";
import ITRDraft from "../models/ITRDraft.js";
import ImportedDocument from "../models/ImportedDocument.js";
import AuditEvent from "../models/AuditEvent.js";
import { clearTaxContextCache } from "../utils/taxContextService.js";

const USER_ID = "507f1f77bcf86cd799439111";

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

const req = () => ({
  requestId: "req-empty-state",
  user: { id: USER_ID },
  query: {},
  body: {},
});

const chain = (value) => ({
  select() {
    return this;
  },
  sort() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return this;
  },
  lean: async () => value,
});

const withModelMocks = async ({ user = {}, draft = null, imports = [], auditEvents = [], draftError = null }, callback) => {
  const originals = {
    userFindById: User.findById,
    draftFindOne: ITRDraft.findOne,
    importFind: ImportedDocument.find,
    auditFind: AuditEvent.find,
  };

  try {
    clearTaxContextCache();
    User.findById = () =>
      chain({
        _id: new mongoose.Types.ObjectId(USER_ID),
        email: "new-user@example.com",
        name: "New User",
        isVerified: true,
        ...user,
      });
    ITRDraft.findOne = () => {
      if (draftError) throw draftError;
      return chain(draft);
    };
    ImportedDocument.find = () => chain(imports);
    AuditEvent.find = () => chain(auditEvents);

    return await callback();
  } finally {
    User.findById = originals.userFindById;
    ITRDraft.findOne = originals.draftFindOne;
    ImportedDocument.find = originals.importFind;
    AuditEvent.find = originals.auditFind;
    clearTaxContextCache();
  }
};

test("dashboard empty authenticated user returns 200 empty onboarding state", async () => {
  await withModelMocks({}, async () => {
    const res = mockResponse();

    await getDashboard(req(), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "No tax data available yet");
    assert.equal(JSON.stringify(res.body).includes("Could not load ITR draft from MongoDB"), false);
    assert.equal(JSON.stringify(res.body).includes("database connection is healthy"), false);
    assert.equal(res.body.data.hasTaxData, false);
    assert.equal(res.body.data.taxIntelligence.calculationStatus.calculationStatus, "not_calculated");
    assert.deepEqual(res.body.data.draft, {});
  });
});

test("dashboard zero-value legacy draft returns empty onboarding message", async () => {
  await withModelMocks(
    {
      draft: {
        userKey: USER_ID,
        salary: { salary17_1: "0", perquisites17_2: "0" },
        houseProperty: { annualRent: "0" },
        pgbp: {},
        capitalGains: {},
        otherSources: {},
        deductions: { section80C: "0" },
        taxpayerProfile: {},
        aisImport: {},
        extractionReview: [{ path: "salary.salary17_1", value: "0", status: "extracted" }],
      },
    },
    async () => {
      const res = mockResponse();

      await getDashboard(req(), res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.hasTaxData, false);
      assert.equal(res.body.data.taxIntelligence.calculationStatus.calculationStatus, "not_calculated");
      assert.equal(
        res.body.data.taxIntelligence.calculationStatus.reason,
        "Import documents or start your ITR draft to begin calculations."
      );
      assert.equal(JSON.stringify(res.body).includes("Estimate uses saved data"), false);
    }
  );
});

test("tax savings empty authenticated user returns 200 not_calculated state", async () => {
  await withModelMocks({}, async () => {
    const res = mockResponse();

    await getTaxSavings(req(), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.calculationStatus, "not_calculated");
    assert.equal(res.body.data.reason, "Income and deductions are not available yet");
    assert.deepEqual(res.body.data.opportunities, []);
    assert.deepEqual(res.body.data.scenarios, []);
  });
});

test("documents empty authenticated user returns an empty import list", async () => {
  await withModelMocks({}, async () => {
    const res = mockResponse();

    await listImports(req(), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "No imported documents yet");
    assert.deepEqual(res.body.data.imports, []);
    assert.equal(res.body.data.emptyState, true);
  });
});

test("ITR draft empty authenticated user returns no draft state", async () => {
  await withModelMocks({}, async () => {
    const res = mockResponse();

    await getAuthenticatedDraft(req(), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "Draft not found");
    assert.equal(res.body.data.draft, null);
  });
});

test("deductions empty authenticated user returns default empty profile", async () => {
  await withModelMocks({}, async () => {
    const res = mockResponse();

    await getDeductions(req(), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "No deductions saved yet");
    assert.equal(res.body.data.emptyState, true);
    assert.deepEqual(res.body.data.deductions, {
      section80C: "",
      healthInsurance: "",
      homeLoanInterest: "",
    });
  });
});

test("actual Mongo draft query failure still returns a safe structured error", async () => {
  await withModelMocks({ draftError: new Error("mongo exploded") }, async () => {
    const res = mockResponse();

    await getDashboard(req(), res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, "TAX_CONTEXT_LOAD_FAILED");
    assert.equal(res.body.data.service, "ITR draft");
    assert.equal(res.body.data.authenticated, true);
    assert.equal(res.body.data.queryError.message, "mongo exploded");
  });
});
