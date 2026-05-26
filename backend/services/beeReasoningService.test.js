import assert from "node:assert/strict";
import test from "node:test";
import { buildBeeReasoningResponse } from "./beeReasoningService.js";
import { buildTaxIntelligenceReport } from "./taxIntelligenceService.js";
import { buildAssistantActions } from "../utils/assistantActions.js";

test("Bee Assistant returns missingData and refuses unsupported certainty when context is incomplete", () => {
  const context = { hasTaxData: false, draft: {}, deductions: {}, extractionReview: [], imports: [] };
  const intelligence = buildTaxIntelligenceReport(context);
  const response = buildBeeReasoningResponse({
    message: "Can you say with certainty what my refund is?",
    context,
    intelligence,
    reviewerComments: [],
    actions: [],
  });

  assert.ok(response.missingData.includes("income"));
  assert.match(response.reply, /not have enough|missing|confidence/i);
  assert.ok(response.warnings.some((warning) => /not calculated|guarantee|missing/i.test(warning)));
});

test("Bee Assistant includes source and provenance metadata", () => {
  const context = {
    hasTaxData: true,
    persistedDraft: { userKey: "u1" },
    imports: [{ id: "import-1", documentType: "FORM_16" }],
    extractionReview: [
      { path: "salary.salary17_1", value: "1000000", status: "confirmed", source: "form16.pdf", confidence: 95 },
    ],
    auditTimeline: [{ id: "audit-1", eventType: "field_confirmation", fieldKey: "salary.salary17_1" }],
    provenance: {
      "salary.salary17_1": [{ id: "audit-1", fieldKey: "salary.salary17_1" }],
    },
    draft: { salary: { salary17_1: "1000000" } },
    taxpayerProfile: { panLastFour: "1234" },
    aisImport: { totals: { tds: 10000 } },
    taxCredits: { tds: "10000" },
    deductions: { section80C: "100000" },
  };
  const intelligence = buildTaxIntelligenceReport(context);
  const response = buildBeeReasoningResponse({
    message: "show source and audit provenance for salary",
    context,
    intelligence,
    reviewerComments: [],
    actions: [],
  });

  assert.ok(response.explainability.sourceFields.includes("salary.salary17_1"));
  assert.ok(response.explainability.sourceDocuments.includes("form16.pdf"));
  assert.ok(response.explainability.auditRefs.includes("audit-1"));
});

test("Bee Assistant actions do not create reviewer-comment action when field update action is detected", () => {
  const actions = buildAssistantActions({
    message: "Set salary to 10 lakh and add reviewer comment",
    taxAnalysis: { missingFields: [], warnings: [] },
  });

  assert.ok(actions.some((action) => action.type === "set_local_storage"));
  assert.equal(actions.some((action) => action.type === "create_reviewer_comment"), false);
});
