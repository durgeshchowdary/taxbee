const formatRupees = (value) => {
  if (value === null || value === undefined || value === "") return "not available";
  const number = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(number)) return String(value);
  return `Rs. ${Math.round(number).toLocaleString("en-IN")}`;
};

const unique = (items = []) => [...new Set(items.filter(Boolean))];

const normalize = (message = "") => String(message || "").toLowerCase();

const provenanceForFields = (context = {}, fields = []) =>
  fields.flatMap((field) => context.provenance?.[field] || []).slice(0, 8);

const docsForFields = (context = {}, fields = []) =>
  unique(
    (context.extractionReview || [])
      .filter((field) => fields.some((sourceField) => field.path === sourceField || field.path?.startsWith(`${sourceField}.`)))
      .map((field) => field.source)
  );

const statusSummary = (context = {}) => {
  const fields = context.extractionReview || [];
  return {
    confirmed: fields.filter((field) => field.status === "confirmed").length,
    extracted: fields.filter((field) => field.status === "extracted").length,
    overridden: fields.filter((field) => field.status === "overridden").length,
  };
};

const modeForMessage = (message = "") => {
  const text = normalize(message);
  if (/\b(audit|provenance|source|history|where.*came|document support|supported by)\b/.test(text)) return "audit";
  if (/\b(ca|reviewer|client|comment|review note)\b/.test(text)) return "reviewer";
  if (/\b(detail|explain fully|why exactly|calculation basis)\b/.test(text)) return "detailed";
  return "simple";
};

const questionType = (message = "") => {
  const text = normalize(message);
  if (/\b(regime|old.*new|new.*old)\b/.test(text)) return "regime";
  if (/\b(80c|80d|deduction|nps|hra|saving|opportunity)\b/.test(text)) return "deduction";
  if (/\b(risk|anomaly|warning|mismatch|flag|error)\b/.test(text)) return "anomaly";
  if (/\b(readiness|ready|progress|completion|file|filing)\b/.test(text)) return "readiness";
  if (/\b(confidence|trust|reliable|final|certainty)\b/.test(text)) return "confidence";
  if (/\b(source|audit|provenance|document|history|where)\b/.test(text)) return "source";
  if (/\b(missing|need|required|next)\b/.test(text)) return "missing";
  if (/^(hi|hello|hey|namaste)\b/.test(text)) return "greeting";
  return "overview";
};

const baseResponse = ({ context, intelligence, reviewerNotes, mode }) => {
  const status = statusSummary(context);
  const calculation = intelligence.calculationStatus || {};
  return {
    answer: "",
    reasoning: [],
    confidence: intelligence.confidenceScore ?? 0,
    basedOn: [
      context.persistedDraft ? "MongoDB ITR draft" : "",
      context.imports?.length ? "MongoDB imported documents" : "",
      context.auditTimeline?.length ? "audit/provenance timeline" : "",
      reviewerNotes.length ? "reviewer comments" : "",
      intelligence.hasTaxData ? "tax intelligence output" : "",
    ].filter(Boolean),
    sourceFields: [],
    sourceDocuments: [],
    auditReferences: [],
    auditRefs: [],
    calculationBasis: [],
    warnings: [],
    missingData: unique([
      ...(intelligence.missingDocuments || []),
      ...(calculation.missingFields || []),
    ]),
    suggestedActions: [],
    reviewerNotes,
    mode,
    dataStates: status,
    calculationStatus: calculation,
  };
};

const withSources = (response, context, fields = []) => {
  const auditReferences = provenanceForFields(context, fields);
  return {
    ...response,
    sourceFields: unique([...(response.sourceFields || []), ...fields]),
    sourceDocuments: unique([...(response.sourceDocuments || []), ...docsForFields(context, fields)]),
    auditReferences: [...(response.auditReferences || []), ...auditReferences],
    auditRefs: [...(response.auditRefs || []), ...auditReferences.map((item) => item.id)],
  };
};

const missingDataAnswer = ({ response, intelligence }) => ({
  ...response,
  answer:
    intelligence.calculationStatus?.reason ||
    "I do not have enough verified tax data to calculate this yet.",
  reasoning: [
    "TaxBee will not invent income, deductions, refunds, risks, or regime benefits.",
    "The calculation can become reliable only after the missing documents or fields are added and reviewed.",
  ],
  warnings: ["Not calculated. No filing-critical estimate should be treated as final."],
  suggestedActions: [
    intelligence.calculationStatus?.recommendedNextStep,
    "Import AIS/Form 26AS or Form 16, then confirm or override extracted fields.",
  ].filter(Boolean),
});

const explainRegime = ({ response, context, intelligence }) => {
  const status = intelligence.calculationStatus || {};
  if (status.calculationStatus === "not_calculated") {
    return missingDataAnswer({ response, intelligence });
  }

  const fields = ["salary", "houseProperty", "pgbp", "capitalGains", "otherSources", "deductions"];
  const recommended = intelligence.recommendedRegime || "not available";
  const preliminary = status.calculationStatus === "preliminary";
  return withSources(
    {
      ...response,
      answer: `TaxBee currently prefers the ${recommended} regime, but this is ${preliminary ? "a preliminary estimate" : "an estimate from reviewed saved data"}.`,
      reasoning: [
        `Old regime estimate: ${formatRupees(intelligence.oldRegimeEstimate)}.`,
        `New regime estimate: ${formatRupees(intelligence.newRegimeEstimate)}.`,
        status.reason,
      ].filter(Boolean),
      calculationBasis: [
        "Regime comparison uses Mongo-backed income heads, saved deductions, reviewed imports, and the shared tax engine.",
        "If deductions or AIS/Form 26AS review are incomplete, the recommendation remains preliminary.",
      ],
      warnings: preliminary ? ["Some data is missing or unreviewed, so do not treat this as final filing advice."] : [],
      suggestedActions: preliminary
        ? ["Review extracted fields and confirm deduction/tax-credit documents before relying on regime choice."]
        : ["Verify the final ITR draft against Form 16, AIS/Form 26AS, and tax payment records."],
    },
    context,
    fields
  );
};

const explainDeduction = ({ response, context, intelligence }) => {
  const opportunity = intelligence.deductionOpportunities?.[0];
  if (!opportunity) {
    return {
      ...response,
      answer: "I do not see a grounded deduction opportunity to recommend right now.",
      reasoning: ["TaxBee only suggests deduction opportunities from saved Mongo-backed data and policy limits."],
      warnings: ["No deduction eligibility is assumed without supporting data."],
      suggestedActions: ["Upload eligible proof or save confirmed deduction values if you have them."],
    };
  }

  return withSources(
    {
      ...response,
      answer: `${opportunity.title}: ${opportunity.description}`,
      reasoning: [opportunity.calculationBasis, opportunity.recommendedAction].filter(Boolean),
      calculationBasis: [opportunity.calculationBasis].filter(Boolean),
      warnings: ["This is an opportunity prompt, not a guaranteed tax-saving claim."],
      suggestedActions: [opportunity.recommendedAction].filter(Boolean),
      confidence: opportunity.confidence ?? response.confidence,
    },
    context,
    opportunity.sourceFields || []
  );
};

const explainAnomaly = ({ response, context, intelligence }) => {
  const anomaly = intelligence.anomalyFlags?.[0];
  if (!anomaly) {
    return {
      ...response,
      answer: "I do not see an active anomaly flag in the current Mongo-backed tax context.",
      reasoning: ["Risk checks are based on saved income, tax credits, imports, review status, and missing profile signals."],
      suggestedActions: ["Keep imports and deductions reviewed before final filing."],
    };
  }

  return withSources(
    {
      ...response,
      answer: `${anomaly.title}: ${anomaly.description}`,
      reasoning: [anomaly.calculationBasis, anomaly.recommendedAction].filter(Boolean),
      calculationBasis: [anomaly.calculationBasis].filter(Boolean),
      warnings: [`Severity: ${anomaly.severity}. This should be reviewed before filing.`],
      suggestedActions: [anomaly.recommendedAction].filter(Boolean),
      confidence: anomaly.confidence ?? response.confidence,
    },
    context,
    anomaly.sourceFields || []
  );
};

const explainReadiness = ({ response, intelligence }) => {
  const checks = intelligence.readinessChecks || [];
  return {
    ...response,
    answer: `Your filing readiness score is ${intelligence.filingReadinessScore ?? 0} out of 100.`,
    reasoning: checks.map((check) => `${check.done ? "Done" : "Missing"}: ${check.label}`),
    calculationBasis: ["Readiness is based on income, profile/PAN context, imports, deductions, tax credits, import review, and unresolved high-risk anomalies."],
    warnings: intelligence.calculationStatus?.calculationStatus !== "calculated"
      ? ["Readiness is not the same as filing correctness. Missing or unreviewed data still needs attention."]
      : [],
    suggestedActions: intelligence.calculationStatus?.recommendedNextStep ? [intelligence.calculationStatus.recommendedNextStep] : [],
  };
};

const explainConfidence = ({ response, intelligence }) => ({
  ...response,
  answer: `TaxBee's current confidence score is ${intelligence.confidenceScore ?? 0} out of 100.`,
  reasoning: [
    intelligence.calculationStatus?.reason,
    "Confidence improves when imports exist, extracted fields are reviewed, deductions are supported, and tax credits/TDS are visible.",
    "Confidence drops when high or medium severity anomaly flags remain.",
  ].filter(Boolean),
  calculationBasis: ["Confidence is computed from Mongo-backed data quality and anomaly signals, not from guesswork."],
  warnings: ["A confidence score is not a filing guarantee."],
  suggestedActions: [intelligence.calculationStatus?.recommendedNextStep].filter(Boolean),
});

const explainSources = ({ response, context }) => {
  const recentAudit = (context.auditTimeline || []).slice(0, 6);
  const recentFields = (context.extractionReview || []).slice(0, 8);
  return {
    ...response,
    answer: recentAudit.length
      ? "Here are the most recent sources and changes TaxBee can trace."
      : "I do not see audit/provenance events yet for this workspace.",
    reasoning: [
      ...recentFields.map((field) => `${field.path}: ${field.status} from ${field.source || "unknown document"} at ${field.confidence ?? "n/a"}% confidence`),
      ...recentAudit.map((event) => `${event.eventType}: ${event.fieldKey || "document"} changed at ${event.timestamp || "unknown time"}`),
    ].slice(0, 10),
    auditReferences: recentAudit,
    auditRefs: recentAudit.map((event) => event.id),
    sourceFields: unique(recentFields.map((field) => field.path)),
    sourceDocuments: unique(recentFields.map((field) => field.source)),
    calculationBasis: ["Provenance is read from ImportedDocument extracted fields and AuditEvent history."],
  };
};

const explainMissing = ({ response, intelligence, reviewerNotes }) => ({
  ...response,
  answer: response.missingData.length
    ? `TaxBee is still missing: ${response.missingData.join(", ")}.`
    : "TaxBee does not currently list required missing documents, but final filing still needs review.",
  reasoning: [
    intelligence.calculationStatus?.reason,
    reviewerNotes.length ? `${reviewerNotes.length} unresolved reviewer comment(s) are also open.` : "",
  ].filter(Boolean),
  warnings: ["If a value is missing, TaxBee will not fabricate it for calculations."],
  suggestedActions: [
    intelligence.calculationStatus?.recommendedNextStep,
    reviewerNotes.length ? "Resolve open reviewer comments before final review." : "",
  ].filter(Boolean),
});

const explainReviewer = ({ response, reviewerNotes }) => ({
  ...response,
  answer: reviewerNotes.length
    ? `There are ${reviewerNotes.length} unresolved reviewer comment(s).`
    : "I do not see unresolved reviewer comments for this workspace.",
  reasoning: reviewerNotes.slice(0, 5).map((note) => `${note.fieldKey || "Workspace"}: ${note.comment}`),
  suggestedActions: reviewerNotes.length ? ["Resolve reviewer comments after checking the related fields/documents."] : [],
});

const overview = ({ response, context, intelligence }) => {
  if (!context.hasTaxData) {
    return missingDataAnswer({ response, intelligence });
  }

  return {
    ...response,
    answer: "I can explain your tax position using the saved TaxBee context, but I will keep it provisional unless all required data is reviewed.",
    reasoning: [
      `Calculation status: ${intelligence.calculationStatus?.calculationStatus || "unknown"}.`,
      `Readiness: ${intelligence.filingReadinessScore ?? 0}/100.`,
      `Risk score: ${intelligence.riskScore ?? 0}/100.`,
      `Data states: ${response.dataStates.confirmed} confirmed, ${response.dataStates.extracted} extracted, ${response.dataStates.overridden} overridden.`,
    ],
    warnings: intelligence.calculationStatus?.calculationStatus !== "calculated"
      ? ["Some answers may be preliminary because saved data is missing or unreviewed."]
      : [],
    suggestedActions: intelligence.actionRecommendations?.slice(0, 4) || [],
  };
};

export const buildBeeReasoningResponse = ({
  message,
  context,
  intelligence,
  reviewerComments = [],
  actions = [],
}) => {
  const mode = modeForMessage(message);
  const type = questionType(message);
  const reviewerNotes = reviewerComments
    .filter((comment) => comment.status === "open")
    .map((comment) => ({
      id: String(comment._id || comment.id),
      fieldKey: comment.fieldKey || "",
      comment: comment.comment,
      status: comment.status,
      createdAt: comment.createdAt,
    }));
  const response = baseResponse({ context, intelligence, reviewerNotes, mode });

  const handlers = {
    regime: explainRegime,
    deduction: explainDeduction,
    anomaly: explainAnomaly,
    readiness: explainReadiness,
    confidence: explainConfidence,
    source: explainSources,
    missing: explainMissing,
    reviewer: explainReviewer,
    greeting: ({ response: base }) => ({
      ...base,
      answer: "Hi, I am Bee Assistant. I can explain your saved TaxBee data with sources, confidence, missing items, and audit history.",
      suggestedActions: ["Ask about regime recommendation, deduction opportunities, risks, sources, or filing readiness."],
    }),
    overview,
  };

  const handler = mode === "reviewer" ? explainReviewer : mode === "audit" ? explainSources : handlers[type] || overview;
  const result = handler({ response, context, intelligence, reviewerNotes });
  const missingData = unique([...(result.missingData || []), ...(intelligence.calculationStatus?.missingFields || [])]);
  const warnings = unique([
    ...(result.warnings || []),
    intelligence.calculationStatus?.calculationStatus === "preliminary" ? "Recommendation is preliminary until missing/unreviewed data is resolved." : "",
    intelligence.calculationStatus?.calculationStatus === "not_calculated" ? "Calculation was not performed because required data is missing." : "",
  ]);

  return {
    ...result,
    reply: result.answer,
    missingData,
    warnings,
    actions,
    explainability: {
      confidence: result.confidence,
      basedOn: result.basedOn,
      sourceFields: result.sourceFields,
      sourceDocuments: result.sourceDocuments,
      auditRefs: result.auditRefs,
      calculationBasis: result.calculationBasis,
      warnings,
      missingData,
      dataStates: result.dataStates,
      mode: result.mode,
    },
  };
};
