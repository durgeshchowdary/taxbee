import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import AuditEvent from "../models/AuditEvent.js";
import ImportedDocument from "../models/ImportedDocument.js";
import ITRDraft from "../models/ITRDraft.js";
import User from "../models/user.js";
import {
  applyReviewedImportsToDeductions,
  applyReviewedImportsToDraft,
  buildImportSummary,
  clearTaxContextCache,
  getUserTaxContext,
  invalidateUserTaxContextCache,
  normalizeDraftForContext,
  userKeyInFilter,
} from "./taxContextService.js";

const chainLean = (value) => ({
  select() {
    return this;
  },
  sort() {
    return this;
  },
  limit() {
    return this;
  },
  lean: async () => value,
});

const withTaxContextModelMocks = async ({ user, draft, imports = [], auditEvents = [] }, callback) => {
  const originals = {
    userFindById: User.findById,
    draftFindOne: ITRDraft.findOne,
    importFind: ImportedDocument.find,
    auditFind: AuditEvent.find,
  };

  try {
    User.findById = () => chainLean(user);
    ITRDraft.findOne = () => chainLean(draft);
    ImportedDocument.find = () => chainLean(imports);
    AuditEvent.find = () => chainLean(auditEvents);
    return await callback();
  } finally {
    User.findById = originals.userFindById;
    ITRDraft.findOne = originals.draftFindOne;
    ImportedDocument.find = originals.importFind;
    AuditEvent.find = originals.auditFind;
    clearTaxContextCache();
  }
};

test("confirmed and overridden imports affect draft and deductions while extracted fields stay pending", () => {
  const review = [
    { path: "salary.salary17_1", value: "1000000", status: "confirmed" },
    { path: "deductions.section80C", value: "150000", status: "overridden" },
    { path: "otherSources.fdInterest", value: "25000", status: "extracted" },
  ];

  const draft = applyReviewedImportsToDraft({}, review);
  const deductions = applyReviewedImportsToDeductions({}, review);

  assert.equal(draft.salary.salary17_1, "1000000");
  assert.equal(draft.otherSources, undefined);
  assert.equal(deductions.section80C, "150000");
});

test("reviewed import merge ignores legacy extracted fields without a path", () => {
  const review = [
    { value: "bad legacy row", status: "confirmed" },
    { path: null, value: "also bad", status: "overridden" },
    { path: "salary.salary17_1", value: "900000", status: "confirmed" },
    { path: "deductions.section80C", value: "120000", status: "confirmed" },
  ];

  const draft = applyReviewedImportsToDraft({}, review);
  const deductions = applyReviewedImportsToDeductions({}, review);

  assert.equal(draft.salary.salary17_1, "900000");
  assert.equal(deductions.section80C, "120000");
  assert.equal(draft.undefined, undefined);
});

test("buildImportSummary aggregates totals and extracted fields", () => {
  const summary = buildImportSummary([
    {
      fileName: "ais.json",
      importedAt: new Date("2026-01-01T00:00:00Z"),
      detectedSections: ["Interest"],
      totals: { tds: 1000, interest: 2000 },
      extractedFields: [{ fieldId: "f1", path: "taxCredits.tds", value: "1000", status: "confirmed" }],
    },
    {
      fileName: "form16.pdf",
      detectedSections: ["Salary"],
      totals: { tds: 3000, salary: 500000 },
      extractedFields: [],
    },
  ]);

  assert.equal(summary.aisImport.totals.tds, 4000);
  assert.deepEqual(summary.aisImport.detectedSections.sort(), ["Interest", "Salary"]);
  assert.equal(summary.extractionReview.length, 1);
});

test("buildImportSummary skips malformed legacy extracted fields without paths", () => {
  const summary = buildImportSummary([
    {
      fileName: "legacy-import.json",
      detectedSections: ["Interest"],
      totals: { interest: 2000 },
      extractedFields: [
        { fieldId: "legacy", value: "2000", status: "confirmed" },
        { fieldId: "valid", path: "otherSources.fdInterest", value: "2000", status: "confirmed" },
      ],
    },
  ]);

  assert.equal(summary.extractionReview.length, 1);
  assert.equal(summary.extractionReview[0].path, "otherSources.fdInterest");
});

test("tax context cache can be cleared and invalidated deterministically", async () => {
  clearTaxContextCache();
  invalidateUserTaxContextCache("507f1f77bcf86cd799439011");
  assert.equal(await getUserTaxContext(null), null);
});

test("ITR draft userKey lookup keeps $in trusted when sanitizeFilter is enabled", () => {
  const originalSanitizeFilter = mongoose.get("sanitizeFilter");
  mongoose.set("sanitizeFilter", true);

  try {
    const user = {
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "taxpayer@example.com",
      name: "Tax Payer",
    };
    const query = ITRDraft.findOne({ userKey: userKeyInFilter(user) });

    query._castConditions();

    assert.deepEqual(query.getFilter().userKey.$in, [
      "507f1f77bcf86cd799439011",
      "taxpayer@example.com",
      "Tax Payer",
    ]);
  } finally {
    mongoose.set("sanitizeFilter", originalSanitizeFilter);
  }
});

test("empty authenticated user draft load returns honest empty context", async () => {
  clearTaxContextCache();
  await withTaxContextModelMocks(
    {
      user: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"),
        email: "empty@example.com",
        name: "Empty User",
        isVerified: true,
      },
      draft: null,
    },
    async () => {
      const context = await getUserTaxContext("507f1f77bcf86cd799439012");

      assert.equal(context.hasTaxData, false);
      assert.deepEqual(context.draft, {});
      assert.equal(context.persistedDraft, null);
    }
  );
});

test("empty default draft values do not count as meaningful tax activity", async () => {
  clearTaxContextCache();
  await withTaxContextModelMocks(
    {
      user: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439015"),
        email: "default-empty@example.com",
        name: "Default Empty",
        isVerified: true,
      },
      draft: {
        userKey: "507f1f77bcf86cd799439015",
        salary: { salary17_1: "0", salary17_2: "", salary17_3: 0 },
        houseProperty: { annualValue: "0" },
        pgbp: {},
        capitalGains: {},
        otherSources: {},
        deductions: { section80C: "0", healthInsurance: "" },
        taxpayerProfile: {},
        extractionReview: [{ path: "salary.salary17_1", value: "0", status: "extracted" }],
        aisImport: {},
      },
    },
    async () => {
      const context = await getUserTaxContext("507f1f77bcf86cd799439015");

      assert.equal(context.hasTaxData, false);
      assert.equal(context.aisImport, null);
      assert.equal(context.calculationStatus, "not_calculated");
    }
  );
});

test("non-zero salary amount counts as meaningful tax activity", async () => {
  clearTaxContextCache();
  await withTaxContextModelMocks(
    {
      user: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439016"),
        email: "salary@example.com",
        name: "Salary User",
        isVerified: true,
      },
      draft: {
        userKey: "507f1f77bcf86cd799439016",
        salary: { salary17_1: "750000" },
        houseProperty: {},
        pgbp: {},
        capitalGains: {},
        otherSources: {},
        deductions: {},
        taxpayerProfile: {},
      },
    },
    async () => {
      const context = await getUserTaxContext("507f1f77bcf86cd799439016");

      assert.equal(context.hasTaxData, true);
      assert.equal(context.calculationStatus, "pending_calculation");
    }
  );
});

test("imported document with extracted fields counts as meaningful tax activity", async () => {
  clearTaxContextCache();
  await withTaxContextModelMocks(
    {
      user: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439017"),
        email: "imported@example.com",
        name: "Imported User",
        isVerified: true,
      },
      draft: null,
      imports: [
        {
          _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439018"),
          documentType: "AIS",
          fileName: "ais.pdf",
          importedAt: new Date("2026-02-01T00:00:00Z"),
          detectedSections: [],
          totals: {},
          extractedFields: [{ fieldId: "field-1", path: "otherSources.fdInterest", value: "1000", status: "extracted" }],
          auditTrail: [],
        },
      ],
    },
    async () => {
      const context = await getUserTaxContext("507f1f77bcf86cd799439017");

      assert.equal(context.hasTaxData, true);
      assert.equal(context.imports.length, 1);
      assert.equal(context.aisImport, null);
    }
  );
});

test("persisted draft with only ids, timestamps, and default zero heads is not tax activity", async () => {
  clearTaxContextCache();
  await withTaxContextModelMocks(
    {
      user: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439021"),
        email: "legacy-zero@example.com",
        name: "Legacy Zero",
        isVerified: true,
      },
      draft: {
        _id: new mongoose.Types.ObjectId("69de8cddc39452d9e9fa0d71"),
        userKey: "legacy-zero@example.com",
        __v: 0,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-02T00:00:00Z"),
        salary: {
          salary17_1: "0",
          perquisites17_2: "0",
          profits17_3: "0",
          deductions16: "0",
          standardDeduction: "50000",
          professionalTaxDeduction: "0",
        },
        houseProperty: { annualRent: "0", interestOnLoan: "0" },
        pgbp: { businessReceipts: "0", businessExpenses: "0" },
        capitalGains: { saleValue: "0", costOfAcquisition: "0" },
        otherSources: { savingsInterest: "0", fdInterest: "0" },
        deductions: {},
        taxpayerProfile: {},
        aisImport: { fileName: "legacy-empty.json", detectedSections: [], totals: {} },
        extractionReview: [],
      },
    },
    async () => {
      const context = await getUserTaxContext("507f1f77bcf86cd799439021");

      assert.equal(context.hasTaxData, false);
      assert.equal(context.aisImport, null);
      assert.equal(context.calculationStatus, "not_calculated");
      assert.equal(context.persistedDraft._id.toString(), "69de8cddc39452d9e9fa0d71");
    }
  );
});

test("persisted draft with salary grossSalary counts as tax activity", async () => {
  clearTaxContextCache();
  await withTaxContextModelMocks(
    {
      user: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439022"),
        email: "gross-salary@example.com",
        name: "Gross Salary",
        isVerified: true,
      },
      draft: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439023"),
        userKey: "gross-salary@example.com",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-02T00:00:00Z"),
        salary: { grossSalary: "800000" },
        deductions: {},
        taxpayerProfile: {},
      },
    },
    async () => {
      const context = await getUserTaxContext("507f1f77bcf86cd799439022");

      assert.equal(context.hasTaxData, true);
      assert.equal(context.calculationStatus, "pending_calculation");
    }
  );
});

test("persisted draft with only createdAt and updatedAt is not tax activity", async () => {
  clearTaxContextCache();
  await withTaxContextModelMocks(
    {
      user: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439024"),
        email: "timestamps@example.com",
        name: "Timestamps",
        isVerified: true,
      },
      draft: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439025"),
        userKey: "timestamps@example.com",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-02T00:00:00Z"),
      },
    },
    async () => {
      const context = await getUserTaxContext("507f1f77bcf86cd799439024");

      assert.equal(context.hasTaxData, false);
      assert.equal(context.calculationStatus, "not_calculated");
    }
  );
});

test("persisted draft with zero strings is not tax activity", async () => {
  clearTaxContextCache();
  await withTaxContextModelMocks(
    {
      user: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439026"),
        email: "zero-strings@example.com",
        name: "Zero Strings",
        isVerified: true,
      },
      draft: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439027"),
        userKey: "zero-strings@example.com",
        salary: { salary17_1: "0", grossSalary: "0", standardDeduction: "50000" },
        houseProperty: { annualRent: "0" },
        pgbp: { businessReceipts: "0" },
        capitalGains: { saleValue: "0" },
        otherSources: { fdInterest: "0" },
        deductions: { section80C: "0" },
      },
    },
    async () => {
      const context = await getUserTaxContext("507f1f77bcf86cd799439026");

      assert.equal(context.hasTaxData, false);
      assert.equal(context.calculationStatus, "not_calculated");
    }
  );
});

test("confirmed import field counts as meaningful tax activity", async () => {
  clearTaxContextCache();
  await withTaxContextModelMocks(
    {
      user: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439019"),
        email: "confirmed-field@example.com",
        name: "Confirmed Field",
        isVerified: true,
      },
      draft: {
        userKey: "507f1f77bcf86cd799439019",
        salary: {},
        houseProperty: {},
        pgbp: {},
        capitalGains: {},
        otherSources: {},
        deductions: {},
        taxpayerProfile: {},
        extractionReview: [{ path: "salary.salary17_1", value: "650000", status: "confirmed" }],
      },
    },
    async () => {
      const context = await getUserTaxContext("507f1f77bcf86cd799439019");

      assert.equal(context.hasTaxData, true);
      assert.equal(context.draft.salary.salary17_1, "650000");
    }
  );
});

test("non-zero deductions count as meaningful tax activity", async () => {
  clearTaxContextCache();
  await withTaxContextModelMocks(
    {
      user: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439020"),
        email: "deductions@example.com",
        name: "Deductions User",
        isVerified: true,
      },
      draft: {
        userKey: "507f1f77bcf86cd799439020",
        salary: {},
        houseProperty: {},
        pgbp: {},
        capitalGains: {},
        otherSources: {},
        deductions: { section80C: "50000" },
        taxpayerProfile: {},
      },
    },
    async () => {
      const context = await getUserTaxContext("507f1f77bcf86cd799439020");

      assert.equal(context.hasTaxData, true);
      assert.equal(context.deductions.section80C, "50000");
    }
  );
});

test("authenticated draft fetch returns valid Mongo draft data", async () => {
  clearTaxContextCache();
  await withTaxContextModelMocks(
    {
      user: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"),
        email: "valid@example.com",
        name: "Valid User",
        isVerified: true,
      },
      draft: {
        userKey: "507f1f77bcf86cd799439013",
        salary: { salary17_1: "900000" },
        houseProperty: {},
        pgbp: {},
        capitalGains: {},
        otherSources: {},
        deductions: { section80C: "150000" },
        taxpayerProfile: {},
      },
    },
    async () => {
      const context = await getUserTaxContext("507f1f77bcf86cd799439013");

      assert.equal(context.hasTaxData, true);
      assert.equal(context.draft.salary.salary17_1, "900000");
      assert.equal(context.deductions.section80C, "150000");
    }
  );
});

test("malformed legacy draft rows are normalized instead of crashing load", () => {
  const draft = normalizeDraftForContext({
    userKey: "legacy@example.com",
    salary: "bad legacy value",
    deductions: ["bad", "legacy", "array"],
    extractionReview: [
      { value: "missing path", status: "confirmed" },
      { path: "salary.salary17_1", value: "700000", status: "confirmed" },
    ],
    aisImport: "bad legacy import",
  });

  assert.deepEqual(draft.salary, {});
  assert.deepEqual(draft.deductions, {});
  assert.equal(draft.extractionReview.length, 1);
  assert.equal(draft.aisImport, null);
});

test("tax context cache invalidation forces the next Mongo-backed load", async () => {
  clearTaxContextCache();
  let userLookups = 0;
  await withTaxContextModelMocks(
    {
      user: {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
        email: "cache@example.com",
        name: "Cache User",
        isVerified: true,
      },
      draft: null,
    },
    async () => {
      User.findById = () => {
        userLookups += 1;
        return chainLean({
          _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
          email: "cache@example.com",
          name: "Cache User",
          isVerified: true,
        });
      };

      await getUserTaxContext("507f1f77bcf86cd799439014");
      await getUserTaxContext("507f1f77bcf86cd799439014");
      assert.equal(userLookups, 1);

      invalidateUserTaxContextCache("507f1f77bcf86cd799439014");
      await getUserTaxContext("507f1f77bcf86cd799439014");
      assert.equal(userLookups, 2);
    }
  );
});
