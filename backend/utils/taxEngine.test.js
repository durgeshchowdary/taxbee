import assert from "node:assert/strict";
import test from "node:test";
import {
  TAX_POLICY,
  analyzeTaxContext,
  buildTaxIntelligence,
  calculateDataQuality,
  calculateNewRegimeTax,
  calculateOldRegimeTax,
  calculateTaxByRegime,
  detectTaxAnomalies,
  generateTaxExplanation,
  reconcileTaxCredits,
  simulateDeductionScenarios,
} from "./taxEngine.js";

test("tax policy is centralized for AY 2026-27 assumptions", () => {
  assert.equal(TAX_POLICY.assessmentYear, "2026-27");
  assert.equal(TAX_POLICY.deductionCaps.section80C, 150000);
  assert.equal(TAX_POLICY.rebates.new.taxableIncomeLimit, 1200000);
  assert.equal(TAX_POLICY.cessRate, 0.04);
});

test("old regime applies AY 2026-27 slabs, rebate, and cess", () => {
  assert.equal(Math.round(calculateOldRegimeTax(500000)), 0);
  assert.equal(Math.round(calculateOldRegimeTax(1000000)), 117000);
  assert.equal(Math.round(calculateOldRegimeTax(1200000)), 179400);
});

test("new regime applies AY 2026-27 slabs, rebate, and cess", () => {
  assert.equal(Math.round(calculateNewRegimeTax(1200000)), 0);
  assert.equal(Math.round(calculateNewRegimeTax(1200001)), 62400);
  assert.equal(Math.round(calculateNewRegimeTax(2400000)), 312000);
});

test("surcharge and marginal relief start after Rs. 50 lakh", () => {
  const atThreshold = calculateTaxByRegime(5000000, "new");
  const aboveThreshold = calculateTaxByRegime(5000100, "new");

  assert.equal(Math.round(atThreshold.surcharge), 0);
  assert.equal(Math.round(aboveThreshold.taxAfterSurcharge), Math.round(atThreshold.taxAfterSurcharge + 100));
});

test("analysis uses the same regime calculator helpers", () => {
  const analysis = analyzeTaxContext({
    currentDraft: {
      salary: {
        salary17_1: 1275000,
        perquisites17_2: 0,
        profits17_3: 0,
        exemptions10: 0,
        deductions16: 0,
      },
    },
    deductions: {},
  });

  assert.equal(analysis.tax.oldRegimeEstimatedTax, Math.round(calculateOldRegimeTax(1275000)));
  assert.equal(analysis.tax.newRegimeEstimatedTax, Math.round(calculateNewRegimeTax(1200000)));
  assert.equal(analysis.tax.betterRegime, "new");
});

test("deduction simulation reports savings from planned deductions", () => {
  const simulation = simulateDeductionScenarios({
    currentDraft: {
      salary: {
        salary17_1: 1600000,
      },
    },
    deductions: {
      section80C: 0,
      healthInsurance: 0,
    },
  });

  assert.ok(simulation.scenarios.length >= 3);
  assert.ok(simulation.oldRegimePotentialSavings > 0);
  assert.ok(simulation.bestTax <= simulation.currentTax);
});

test("anomaly detection flags imported interest missing from declared income", () => {
  const anomalies = detectTaxAnomalies({
    currentDraft: {
      salary: {
        salary17_1: 900000,
      },
      otherSources: {
        savingsInterest: 0,
      },
    },
    aisImport: {
      totals: {
        interest: 50000,
        tds: 10000,
      },
    },
  });

  assert.ok(anomalies.score > 0);
  assert.ok(anomalies.flags.some((flag) => flag.title === "Interest income may be incomplete"));
});

test("tax-credit reconciliation reports refund, due, and low-confidence missing data", () => {
  const refund = reconcileTaxCredits({
    estimatedTax: 85000,
    statementTotals: {
      tds: 100000,
      advanceTax: 5000,
    },
  });
  const due = reconcileTaxCredits({
    estimatedTax: 120000,
    statementTotals: {
      tds: 90000,
    },
  });
  const missing = reconcileTaxCredits({ estimatedTax: 0 });

  assert.equal(refund.status, "refund_due");
  assert.equal(refund.refundDue, 20000);
  assert.equal(due.status, "tax_due");
  assert.equal(due.taxDue, 30000);
  assert.equal(missing.status, "insufficient_data");
  assert.equal(missing.confidence, "low");
});

test("data quality distinguishes draft estimates from review-ready returns", () => {
  const lowQuality = calculateDataQuality({});
  const highQuality = calculateDataQuality({
    currentDraft: {
      salary: {
        salary17_1: 900000,
      },
    },
    deductions: {
      section80C: 150000,
    },
    aisImport: {
      totals: {
        salary: 900000,
        tds: 50000,
      },
    },
    extractionReview: [
      {
        id: "salary",
        status: "confirmed",
      },
    ],
  });

  assert.equal(lowQuality.confidence, "low");
  assert.ok(highQuality.score > lowQuality.score);
  assert.equal(highQuality.confidence, "high");
});

test("tax intelligence returns explainable health and next-year planning", () => {
  const intelligence = buildTaxIntelligence({
    currentDraft: {
      salary: {
        salary17_1: 1000000,
      },
    },
    deductions: {},
  });

  assert.ok(intelligence.health.score < 100);
  assert.ok(intelligence.health.penalties.length > 0);
  assert.ok(intelligence.nextYear.scenarios.length >= 3);
  assert.ok(Array.isArray(intelligence.recommendations));
  assert.equal(intelligence.taxCredits.status, "insufficient_data");
  assert.ok(intelligence.dataQuality.checks.length >= 4);
  assert.ok(intelligence.explanation.taxDrivers.length >= 3);
  assert.ok(intelligence.explanation.regimeComparison.length === 2);
});

test("tax explanation exposes regime, scenario, and risk decisions", () => {
  const explanation = generateTaxExplanation({
    currentDraft: {
      salary: {
        salary17_1: 1800000,
      },
    },
    deductions: {
      section80C: 40000,
    },
    aisImport: {
      totals: {
        interest: 50000,
      },
    },
  });

  assert.match(explanation.headline, /regime/i);
  assert.ok(explanation.scenarioComparison.some((scenario) => scenario.savingVsCurrent >= 0));
  assert.ok(explanation.riskBreakdown.some((risk) => risk.points > 0));
});
