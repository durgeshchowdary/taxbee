import { TAX_POLICY, analyzeTaxContext, buildTaxIntelligence } from "../utils/taxEngine.js";

const toNumber = (value) => {
  const number = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const hasAnyAmount = (record = {}) =>
  Object.values(record || {}).some((value) => toNumber(value) > 0);

const hasAisImportData = (record = {}) =>
  Boolean(record && typeof record === "object" && hasAnyAmount(record.totals));

const hasImportActivity = (record = {}) =>
  hasAnyAmount(record.totals) || (record.extractedFields || []).some((field) => field.path);

const countNamedAmounts = (record = {}, keys = []) =>
  keys.filter((key) => toNumber(record?.[key]) > 0).length;

const SALARY_INCOME_KEYS = [
  "salary17_1",
  "perquisites17_2",
  "profits17_3",
  "grossSalary",
  "basicSalary",
  "dearnessAllowance",
  "bonusCommission",
  "hraReceived",
  "ltaReceived",
  "overtimeAllowance",
  "advanceSalary",
  "arrearsOfSalary",
  "leaveSalaryDuringService",
  "pensionUncommuted",
  "feesWagesAnnuity",
  "otherAllowances",
  "rentFreeAccommodation",
  "carFacility",
  "interestFreeLoan",
  "esop",
  "freeGasElectricityWater",
  "freeEducation",
  "householdStaff",
  "creditCardExpenses",
  "clubExpenses",
  "giftTaxablePortion",
  "useTransferOfAssets",
  "employerContribution",
  "otherPerquisites",
  "compensationOnTermination",
  "retrenchmentCompensation",
  "keymanInsurance",
  "otherReceipts",
];
const HOUSE_PROPERTY_INCOME_KEYS = ["annualRent"];
const PGBP_INCOME_KEYS = ["businessReceipts", "otherBusinessIncome"];
const CAPITAL_GAINS_INCOME_KEYS = ["saleValue"];
const OTHER_SOURCES_INCOME_KEYS = ["savingsInterest", "fdInterest", "dividendIncome", "otherIncome"];
const fieldSourceDocuments = (context, path) =>
  (context.extractionReview || [])
    .filter((field) => field.path === path || field.path?.startsWith(`${path}.`))
    .map((field) => field.source)
    .filter(Boolean);

const fieldProvenance = (context, path) => {
  const provenance = context.provenance || {};
  return Object.entries(provenance)
    .filter(([fieldKey]) => fieldKey === path || fieldKey.startsWith(`${path}.`))
    .flatMap(([, events]) => (Array.isArray(events) ? events : []));
};

const makeInsight = ({
  title,
  description,
  severity = "info",
  sourceFields = [],
  sourceDocuments = [],
  provenance = [],
  calculationBasis = "",
  confidence = 70,
  recommendedAction = "",
}) => ({
  title,
  description,
  severity,
  sourceFields,
  sourceDocuments: [...new Set(sourceDocuments.filter(Boolean))],
  provenance,
  calculationBasis,
  confidence,
  recommendedAction,
});

const attachProvenance = (context, items = []) =>
  items.map((item) => ({
    ...item,
    provenance:
      item.provenance && item.provenance.length
        ? item.provenance
        : (item.sourceFields || []).flatMap((field) => fieldProvenance(context, field)),
  }));

const getContextParts = (context = {}) => {
  const draft = context.draft || context.currentDraft || context.itrDraft || {};
  return {
    draft,
    salary: draft.salary || {},
    houseProperty: draft.houseProperty || {},
    pgbp: draft.pgbp || {},
    capitalGains: draft.capitalGains || {},
    otherSources: draft.otherSources || {},
    deductions: context.deductions || {},
    taxCredits: context.taxCredits || {},
    taxpayerProfile: context.taxpayerProfile || {},
    extractionReview: context.extractionReview || [],
    imports: context.imports || [],
    aisImport: context.aisImport || null,
  };
};

const hasIncome = (analysis) =>
  toNumber(analysis.income.grossTotalIncome) > 0 ||
  toNumber(analysis.income.grossSalary) > 0 ||
  toNumber(analysis.income.housePropertyIncome) > 0 ||
  toNumber(analysis.income.businessIncome) > 0 ||
  toNumber(analysis.income.capitalGainsIncome) > 0 ||
  toNumber(analysis.income.otherSourcesIncome) > 0;

const nonZeroIncomeCount = (parts) =>
  countNamedAmounts(parts.salary, SALARY_INCOME_KEYS) +
  countNamedAmounts(parts.houseProperty, HOUSE_PROPERTY_INCOME_KEYS) +
  countNamedAmounts(parts.pgbp, PGBP_INCOME_KEYS) +
  countNamedAmounts(parts.capitalGains, CAPITAL_GAINS_INCOME_KEYS) +
  countNamedAmounts(parts.otherSources, OTHER_SOURCES_INCOME_KEYS);

const draftSectionCount = (parts) =>
  [
    countNamedAmounts(parts.salary, SALARY_INCOME_KEYS),
    countNamedAmounts(parts.houseProperty, HOUSE_PROPERTY_INCOME_KEYS),
    countNamedAmounts(parts.pgbp, PGBP_INCOME_KEYS),
    countNamedAmounts(parts.capitalGains, CAPITAL_GAINS_INCOME_KEYS),
    countNamedAmounts(parts.otherSources, OTHER_SOURCES_INCOME_KEYS),
  ].filter((count) => count > 0).length;

const confirmedFieldCount = (parts) =>
  (parts.extractionReview || []).filter(
    (field) => field.status === "confirmed" || field.status === "overridden"
  ).length;

const hasMeaningfulActivity = ({ context, parts }) =>
  Boolean(
    context.hasTaxData &&
      (parts.imports.some(hasImportActivity) ||
        hasAisImportData(parts.aisImport) ||
        confirmedFieldCount(parts) > 0 ||
        hasAnyAmount(parts.deductions) ||
        draftSectionCount(parts) > 0)
  );

const requiredMissingFields = ({ analysis, parts }) => {
  const missing = [];
  if (!hasIncome(analysis)) missing.push("income");
  if (!parts.taxpayerProfile.panMasked && !parts.taxpayerProfile.panLastFour) missing.push("taxpayerProfile.pan");
  if (!parts.aisImport && parts.imports.length === 0) missing.push("imports.AIS_OR_FORM_26AS");
  return missing;
};

const buildCalculationStatus = ({ analysis, parts, meaningfulActivity }) => {
  const missingFields = requiredMissingFields({ analysis, parts });
  if (!meaningfulActivity || !hasIncome(analysis)) {
    return {
      calculationStatus: "not_calculated",
      reason: "Import documents or start your ITR draft to begin calculations.",
      missingFields,
      recommendedNextStep: "Import Form 16/AIS/Form 26AS or save income details in the ITR draft.",
    };
  }

  const preliminaryReasons = [];
  if (!hasAnyAmount(parts.deductions)) preliminaryReasons.push("deductions are missing or zero");
  if (!parts.aisImport && parts.imports.length === 0) preliminaryReasons.push("AIS/Form 26AS is not imported");
  if ((parts.extractionReview || []).some((field) => field.status === "extracted")) {
    preliminaryReasons.push("some extracted fields are not reviewed");
  }

  if (preliminaryReasons.length) {
    return {
      calculationStatus: "preliminary",
      reason: `Estimate uses saved data but remains preliminary because ${preliminaryReasons.join(", ")}.`,
      missingFields,
      recommendedNextStep: "Review imports and add/confirm deduction and tax-credit documents.",
    };
  }

  return {
    calculationStatus: "calculated",
    reason: "TaxBee has income data and reviewed supporting context for a current estimate.",
    missingFields,
    recommendedNextStep: "Review final values before filing.",
  };
};

const buildAnomalyFlags = ({ context, analysis, engineIntelligence, parts }) => {
  const flags = [];
  const tds = toNumber(engineIntelligence.taxCredits?.tds || parts.taxCredits.tds || parts.aisImport?.totals?.tds);
  const unconfirmed = parts.extractionReview.filter((field) => field.status === "extracted");
  const highConfidenceUnconfirmed = unconfirmed.filter((field) => Number(field.confidence || 0) >= 85);
  const incomePresent = hasIncome(analysis);

  if (incomePresent && tds <= 0) {
    flags.push(makeInsight({
      title: "Income exists but no TDS/tax credit is available",
      description: "Saved income is present, but TaxBee cannot see TDS or tax paid from AIS/Form 26AS/imported credits.",
      severity: "medium",
      sourceFields: ["income.grossTotalIncome", "taxCredits.tds"],
      sourceDocuments: fieldSourceDocuments(context, "taxCredits.tds"),
      calculationBasis: "Gross total income is greater than zero and TDS/tax paid is zero or missing.",
      confidence: 82,
      recommendedAction: "Import/review AIS or Form 26AS and confirm TDS credits.",
    }));
  }

  if (!incomePresent && tds > 0) {
    flags.push(makeInsight({
      title: "TDS exists but income is missing",
      description: "Tax credits are visible, but no corresponding income head is saved.",
      severity: "high",
      sourceFields: ["taxCredits.tds", "income.grossTotalIncome"],
      sourceDocuments: fieldSourceDocuments(context, "taxCredits.tds"),
      calculationBasis: "TDS/tax credit is greater than zero while computed income is zero.",
      confidence: 88,
      recommendedAction: "Map the income source from AIS/Form 26AS or enter the missing income head.",
    }));
  }

  if (parts.imports.length > 0 && unconfirmed.length > 0) {
    flags.push(makeInsight({
      title: "Imported document fields are not fully reviewed",
      description: `${unconfirmed.length} extracted field${unconfirmed.length === 1 ? " is" : "s are"} still pending confirmation or override.`,
      severity: "medium",
      sourceFields: unconfirmed.map((field) => field.path),
      sourceDocuments: unconfirmed.map((field) => field.source),
      calculationBasis: "ImportedDocument.extractedFields contains review status 'extracted'.",
      confidence: 90,
      recommendedAction: "Open Import Data and confirm or override extracted values.",
    }));
  }

  if (highConfidenceUnconfirmed.length > 0) {
    flags.push(makeInsight({
      title: "High-confidence extracted fields still need review",
      description: "TaxBee found confident extracted values, but they are not canonical until reviewed.",
      severity: "medium",
      sourceFields: highConfidenceUnconfirmed.map((field) => field.path),
      sourceDocuments: highConfidenceUnconfirmed.map((field) => field.source),
      calculationBasis: "Confidence is at least 85 and review status remains extracted.",
      confidence: 92,
      recommendedAction: "Confirm high-confidence fields or override them if the document parser is wrong.",
    }));
  }

  if (hasAnyAmount(parts.deductions) && parts.imports.length === 0) {
    flags.push(makeInsight({
      title: "Deductions saved without imported proof",
      description: "Deduction amounts exist, but TaxBee cannot see supporting documents yet.",
      severity: "low",
      sourceFields: ["deductions"],
      calculationBasis: "Deductions are non-zero and no ImportedDocument records exist.",
      confidence: 70,
      recommendedAction: "Upload insurance, investment, rent, donation, or loan proof where relevant.",
    }));
  }

  const grouped = new Map();
  parts.extractionReview.forEach((field) => {
    if (!field.path) return;
    const values = grouped.get(field.path) || new Set();
    values.add(String(field.value ?? ""));
    grouped.set(field.path, values);
  });
  const conflicts = [...grouped.entries()].filter(([, values]) => values.size > 1);
  if (conflicts.length > 0) {
    flags.push(makeInsight({
      title: "Conflicting extracted values found",
      description: "Multiple imported documents produced different values for the same tax field.",
      severity: "high",
      sourceFields: conflicts.map(([path]) => path),
      sourceDocuments: parts.extractionReview.filter((field) => conflicts.some(([path]) => path === field.path)).map((field) => field.source),
      calculationBasis: "Same mapped path has more than one extracted value.",
      confidence: 84,
      recommendedAction: "Review the conflicting fields and override with the correct value.",
    }));
  }

  if (!parts.taxpayerProfile.panMasked && !parts.taxpayerProfile.panLastFour) {
    flags.push(makeInsight({
      title: "Taxpayer PAN/profile is missing",
      description: "TaxBee does not have verified taxpayer profile context for this account.",
      severity: "low",
      sourceFields: ["taxpayerProfile.pan"],
      calculationBasis: "No masked PAN or PAN last four exists in tax context.",
      confidence: 76,
      recommendedAction: "Verify PAN/import context before final filing review.",
    }));
  }

  if (!incomePresent) {
    flags.push(makeInsight({
      title: "Regime comparison cannot be calculated",
      description: "Old/new regime comparison needs saved income data.",
      severity: "medium",
      sourceFields: ["income"],
      calculationBasis: "Gross total income is zero or missing.",
      confidence: 95,
      recommendedAction: "Import Form 16/AIS/Form 26AS or save income details.",
    }));
  }

  return [...flags, ...(engineIntelligence.anomalies?.flags || []).map((flag) =>
    makeInsight({
      title: flag.title || "Tax anomaly",
      description: flag.reason || flag.description || "TaxBee found an issue in the current saved data.",
      severity: flag.points >= 30 ? "high" : flag.points >= 15 ? "medium" : "low",
      sourceFields: flag.sourceFields || [],
      calculationBasis: flag.reason || "",
      confidence: 72,
      recommendedAction: flag.action || "Review this item before filing.",
    })
  )];
};

const buildDeductionOpportunities = ({ analysis, parts }) => {
  if (!hasIncome(analysis)) return [];
  const caps = TAX_POLICY.deductionCaps;
  const opportunities = [];
  const current80C = toNumber(analysis.deductions.section80C);
  const current80D = toNumber(analysis.deductions.healthInsurance80D);
  const currentHomeLoan = toNumber(analysis.deductions.homeLoanInterest);
  const grossIncome = toNumber(analysis.income.grossTotalIncome);
  const rentPaid = toNumber(parts.taxpayerProfile.rentPaid);
  const hra = toNumber(parts.salary.hraReceived);

  if (current80C < caps.section80C && grossIncome > 500000) {
    opportunities.push(makeInsight({
      title: "Unused 80C capacity",
      description: `80C currently uses Rs. ${Math.round(current80C).toLocaleString("en-IN")} of Rs. ${caps.section80C.toLocaleString("en-IN")}.`,
      severity: "opportunity",
      sourceFields: ["deductions.section80C"],
      sourceDocuments: fieldSourceDocuments({ extractionReview: parts.extractionReview }, "deductions.section80C"),
      calculationBasis: "Current 80C is below statutory cap and income is above basic planning threshold.",
      confidence: 78,
      recommendedAction: "Add eligible proof only if you actually made eligible investments/payments.",
    }));
  }

  if (current80D <= 0 && grossIncome > 500000) {
    opportunities.push(makeInsight({
      title: "Check possible 80D health insurance claim",
      description: "No 80D amount is visible in saved deductions.",
      severity: "opportunity",
      sourceFields: ["deductions.healthInsurance"],
      calculationBasis: "Health insurance deduction is zero or missing.",
      confidence: 62,
      recommendedAction: "Upload eligible health insurance proof if available.",
    }));
  }

  opportunities.push(makeInsight({
    title: "Check possible NPS 80CCD(1B)",
    description: "TaxBee does not see NPS 80CCD(1B) data in the current context.",
    severity: "opportunity",
    sourceFields: ["deductions.nps80ccd1b"],
    calculationBasis: "NPS field is absent from saved deductions; this is a prompt to verify, not a guaranteed saving.",
    confidence: 50,
    recommendedAction: "Add NPS proof only if you made an eligible contribution.",
  }));

  if ((hra > 0 || rentPaid > 0) && !(hra > 0 && rentPaid > 0)) {
    opportunities.push(makeInsight({
      title: "HRA/rent data may be incomplete",
      description: "HRA or rent data is partially present, so exemption review may need more detail.",
      severity: "opportunity",
      sourceFields: ["salary.hraReceived", "taxpayerProfile.rentPaid"],
      sourceDocuments: fieldSourceDocuments({ extractionReview: parts.extractionReview }, "taxpayerProfile.rentPaid"),
      calculationBasis: "Only one side of HRA/rent context is visible.",
      confidence: 64,
      recommendedAction: "Upload rent receipts or complete HRA fields before relying on exemption estimates.",
    }));
  }

  if (currentHomeLoan <= 0 && hasAnyAmount(parts.houseProperty)) {
    opportunities.push(makeInsight({
      title: "Check home loan interest proof",
      description: "House property context exists but home loan interest deduction is not visible.",
      severity: "opportunity",
      sourceFields: ["deductions.homeLoanInterest", "houseProperty.interestOnLoan"],
      calculationBasis: "House property data exists and old-regime home loan deduction is zero.",
      confidence: 60,
      recommendedAction: "Upload interest certificate only if applicable.",
    }));
  }

  return opportunities;
};

const buildReadiness = ({ analysis, parts, anomalyFlags }) => {
  const checks = [
    { label: "Income present", done: hasIncome(analysis), weight: 20 },
    { label: "PAN/profile present", done: Boolean(parts.taxpayerProfile.panMasked || parts.taxpayerProfile.panLastFour), weight: 10 },
    { label: "AIS/Form 16/26AS imported", done: Boolean(parts.aisImport || parts.imports.length), weight: 15 },
    { label: "Deductions reviewed", done: hasAnyAmount(parts.deductions), weight: 10 },
    { label: "Tax credits/TDS present", done: toNumber(parts.taxCredits.tds || parts.aisImport?.totals?.tds) > 0, weight: 15 },
    { label: "Import review complete", done: !parts.extractionReview.some((field) => field.status === "extracted"), weight: 20 },
    { label: "No high severity anomalies", done: !anomalyFlags.some((flag) => flag.severity === "high"), weight: 10 },
  ];
  const score = checks.reduce((sum, check) => sum + (check.done ? check.weight : 0), 0);
  return {
    filingReadinessScore: Math.round(score),
    checks,
  };
};

const buildConfidenceScore = ({ calculationStatus, parts, anomalyFlags }) => {
  if (calculationStatus.calculationStatus === "not_calculated") return 0;
  let score = 55;
  if (parts.imports.length > 0) score += 10;
  if (!parts.extractionReview.some((field) => field.status === "extracted")) score += 15;
  if (hasAnyAmount(parts.deductions)) score += 5;
  if (toNumber(parts.taxCredits.tds || parts.aisImport?.totals?.tds) > 0) score += 5;
  score -= anomalyFlags.filter((flag) => flag.severity === "high").length * 12;
  score -= anomalyFlags.filter((flag) => flag.severity === "medium").length * 6;
  return Math.max(0, Math.min(100, Math.round(score)));
};

export const buildTaxIntelligenceReport = (context = {}) => {
  const parts = getContextParts(context);
  const engineContext = {
    currentDraft: parts.draft,
    deductions: parts.deductions,
    aisImport: parts.aisImport,
    extractionReview: parts.extractionReview,
    taxCredits: parts.taxCredits,
  };
  const analysis = analyzeTaxContext(engineContext);
  const engineIntelligence = buildTaxIntelligence(engineContext);
  const meaningfulActivity = hasMeaningfulActivity({ context, parts });
  const calculationStatus = buildCalculationStatus({ analysis, parts, meaningfulActivity });
  const anomalyFlags = attachProvenance(context, buildAnomalyFlags({ context, analysis, engineIntelligence, parts }));
  const deductionOpportunities = attachProvenance(context, buildDeductionOpportunities({ analysis, parts }));
  const readiness = buildReadiness({ analysis, parts, anomalyFlags });
  const confidenceScore = buildConfidenceScore({ calculationStatus, parts, anomalyFlags });
  const incomePresent = hasIncome(analysis);
  const oldRegimeEstimate = incomePresent ? analysis.tax.oldRegimeEstimatedTax : null;
  const newRegimeEstimate = incomePresent ? analysis.tax.newRegimeEstimatedTax : null;
  const recommendedRegime = incomePresent ? analysis.tax.betterRegime : null;
  const estimatedTaxPayable = incomePresent
    ? Math.min(analysis.tax.oldRegimeEstimatedTax, analysis.tax.newRegimeEstimatedTax)
    : null;
  const estimatedRefundOrDue = incomePresent && engineIntelligence.taxCredits
    ? {
        refundDue: engineIntelligence.taxCredits.refundDue,
        additionalTaxDue: engineIntelligence.taxCredits.additionalTaxDue,
        totalCredits: engineIntelligence.taxCredits.totalCredits,
      }
    : null;
  const missingDocuments = [
    ...(context.missingDocuments || []),
    !parts.imports.some((item) => item.documentType === "FORM_16") && !hasAnyAmount(parts.salary) ? "Form 16 or salary slip" : "",
    !parts.imports.some((item) => item.documentType === "FORM_26AS" || item.documentType === "AIS") ? "AIS/Form 26AS" : "",
  ].filter(Boolean);
  const actionRecommendations = [
    ...anomalyFlags.slice(0, 4).map((flag) => flag.recommendedAction),
    ...deductionOpportunities.slice(0, 3).map((item) => item.recommendedAction),
  ].filter(Boolean);

  return {
    hasTaxData: Boolean(context.hasTaxData),
    meaningfulActivity,
    diagnostics: {
      hasTaxData: Boolean(context.hasTaxData),
      meaningfulActivity,
      importsCount: parts.imports.length,
      nonZeroIncomeCount: nonZeroIncomeCount(parts),
      confirmedFieldCount: confirmedFieldCount(parts),
      deductionActivity: hasAnyAmount(parts.deductions),
      draftSectionCount: draftSectionCount(parts),
    },
    filingReadinessScore: readiness.filingReadinessScore,
    readinessChecks: readiness.checks,
    missingDocuments: [...new Set(missingDocuments)],
    anomalyFlags,
    oldRegimeEstimate,
    newRegimeEstimate,
    recommendedRegime,
    estimatedTaxPayable,
    estimatedRefundOrDue,
    deductionOpportunities,
    riskScore: Math.min(100, Math.max(0, Math.round(engineIntelligence.anomalies?.score || anomalyFlags.length * 12))),
    confidenceScore,
    actionRecommendations: [...new Set(actionRecommendations)],
    calculationStatus,
    analysis,
    legacy: engineIntelligence,
  };
};
