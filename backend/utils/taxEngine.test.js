import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeTaxContext,
  buildTaxIntelligence,
  calculateNewRegimeTax,
  calculateOldRegimeTax,
  calculateTaxByRegime,
  detectTaxAnomalies,
  generateTaxExplanation,
  simulateDeductionScenarios,
} from "./taxEngine.js";

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
