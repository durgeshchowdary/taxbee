import assert from "node:assert/strict";
import test from "node:test";
import { buildTaxIntelligenceReport } from "./taxIntelligenceService.js";

test("tax intelligence does not calculate when income is missing", () => {
  const report = buildTaxIntelligenceReport({ hasTaxData: false, draft: {}, deductions: {} });

  assert.equal(report.calculationStatus.calculationStatus, "not_calculated");
  assert.equal(report.calculationStatus.reason, "Import documents or start your ITR draft to begin calculations.");
  assert.equal(report.meaningfulActivity, false);
  assert.equal(report.estimatedTaxPayable, null);
  assert.ok(report.calculationStatus.missingFields.includes("income"));
});

test("zero-value legacy draft does not produce preliminary saved-data messaging", () => {
  const report = buildTaxIntelligenceReport({
    hasTaxData: false,
    draft: {
      salary: { salary17_1: "0", perquisites17_2: "0", profits17_3: "", standardDeduction: "50000" },
      houseProperty: { annualRent: "0" },
      pgbp: {},
      capitalGains: {},
      otherSources: {},
    },
    deductions: { section80C: "0" },
    aisImport: {},
    extractionReview: [{ path: "salary.salary17_1", value: "0", status: "extracted" }],
  });

  assert.equal(report.calculationStatus.calculationStatus, "not_calculated");
  assert.equal(report.calculationStatus.reason, "Import documents or start your ITR draft to begin calculations.");
  assert.equal(report.calculationStatus.reason.includes("Estimate uses saved data"), false);
  assert.equal(report.meaningfulActivity, false);
  assert.equal(report.diagnostics.nonZeroIncomeCount, 0);
  assert.equal(report.diagnostics.deductionActivity, false);
});

test("tax intelligence marks incomplete saved data as preliminary", () => {
  const report = buildTaxIntelligenceReport({
    hasTaxData: true,
    draft: { salary: { salary17_1: "1200000" } },
    deductions: {},
    extractionReview: [{ path: "salary.salary17_1", value: "1200000", status: "extracted" }],
  });

  assert.equal(report.calculationStatus.calculationStatus, "preliminary");
  assert.ok(report.oldRegimeEstimate !== null);
});

test("non-zero salary counts as meaningful activity and can be preliminary", () => {
  const report = buildTaxIntelligenceReport({
    hasTaxData: true,
    draft: { salary: { salary17_1: "900000" } },
    deductions: {},
  });

  assert.equal(report.meaningfulActivity, true);
  assert.equal(report.diagnostics.nonZeroIncomeCount, 1);
  assert.equal(report.calculationStatus.calculationStatus, "preliminary");
});

test("confirmed import field counts as meaningful activity", () => {
  const report = buildTaxIntelligenceReport({
    hasTaxData: true,
    draft: { salary: { salary17_1: "800000" } },
    deductions: {},
    extractionReview: [{ path: "salary.salary17_1", value: "800000", status: "confirmed" }],
  });

  assert.equal(report.meaningfulActivity, true);
  assert.equal(report.diagnostics.confirmedFieldCount, 1);
  assert.equal(report.calculationStatus.calculationStatus, "preliminary");
});

test("deductions without income are activity but not a tax calculation", () => {
  const report = buildTaxIntelligenceReport({
    hasTaxData: true,
    draft: {},
    deductions: { section80C: "150000" },
  });

  assert.equal(report.meaningfulActivity, true);
  assert.equal(report.diagnostics.deductionActivity, true);
  assert.equal(report.calculationStatus.calculationStatus, "not_calculated");
  assert.equal(report.calculationStatus.reason, "Import documents or start your ITR draft to begin calculations.");
});

test("confirmed and overridden imports provide source/provenance-backed context", () => {
  const report = buildTaxIntelligenceReport({
    hasTaxData: true,
    draft: { salary: { salary17_1: "1000000" } },
    deductions: { section80C: "150000" },
    aisImport: { totals: { tds: 50000 } },
    imports: [{ documentType: "AIS" }],
    extractionReview: [
      { path: "salary.salary17_1", value: "1000000", status: "confirmed", source: "form16.pdf" },
      { path: "deductions.section80C", value: "150000", status: "overridden", source: "proof.pdf" },
    ],
    taxpayerProfile: { panLastFour: "1234" },
    taxCredits: { tds: "50000" },
    provenance: {
      "salary.salary17_1": [{ id: "audit-1", fieldKey: "salary.salary17_1" }],
    },
  });

  assert.notEqual(report.calculationStatus.calculationStatus, "not_calculated");
  assert.ok(report.confidenceScore > 0);
  assert.ok(report.deductionOpportunities.every((item) => Array.isArray(item.provenance)));
});
