import ITRDraft from "../models/ITRDraft.js";
import ImportedDocument from "../models/ImportedDocument.js";
import User from "../models/user.js";
import AuditEvent from "../models/AuditEvent.js";
import mongoose from "mongoose";
import { getCache, setCache, deleteCache, clearCache } from "../services/cacheService.js";

const TAX_CONTEXT_CACHE_TTL_SECONDS = 30;

const cacheKey = (userId) => `tax-context:${userId}`;

export const invalidateUserTaxContextCache = async (userId) => {
  if (!userId) return;
  await deleteCache(cacheKey(userId));
};

export const clearTaxContextCache = async () => {
  await clearCache();
};

const hasAnyAmount = (value = {}) =>
  Object.values(value || {}).some((item) => Number(String(item ?? "").replace(/,/g, "")) > 0);

const hasAnyNamedAmount = (record = {}, keys = []) =>
  keys.some((key) => Number(String(record?.[key] ?? "").replace(/,/g, "")) > 0);

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
const PROFILE_KEYS = ["pan", "panMasked", "panLastFour"];

const hasDraftIncomeActivity = (draft = {}) =>
  hasAnyNamedAmount(draft.salary, SALARY_INCOME_KEYS) ||
  hasAnyNamedAmount(draft.houseProperty, HOUSE_PROPERTY_INCOME_KEYS) ||
  hasAnyNamedAmount(draft.pgbp, PGBP_INCOME_KEYS) ||
  hasAnyNamedAmount(draft.capitalGains, CAPITAL_GAINS_INCOME_KEYS) ||
  hasAnyNamedAmount(draft.otherSources, OTHER_SOURCES_INCOME_KEYS);

const hasTaxpayerProfileData = (profile = {}) =>
  PROFILE_KEYS.some((key) => String(profile?.[key] || "").trim());

const safeFieldPath = (field = {}) =>
  typeof field.path === "string" ? field.path.trim() : "";

const hasCanonicalFieldPath = (field = {}) => Boolean(safeFieldPath(field));

const hasRealExtractedFields = (doc = {}) =>
  (doc.extractedFields || []).some((field) => hasCanonicalFieldPath(field));

const hasImportActivity = (doc = {}) =>
  hasRealExtractedFields(doc) || hasAnyAmount(doc.totals);

const hasAisImportData = (value) =>
  Boolean(value && typeof value === "object" && hasAnyAmount(value.totals));

const setPathValue = (record, path, value) => {
  if (!path) return;

  const segments = path.split(".");
  let cursor = record;

  segments.slice(0, -1).forEach((segment) => {
    if (!cursor[segment] || typeof cursor[segment] !== "object") cursor[segment] = {};
    cursor = cursor[segment];
  });

  cursor[segments[segments.length - 1]] = value;
};

export class TaxContextLoadError extends Error {
  constructor(service, cause) {
    super(`Could not load ${service} from MongoDB`);
    this.name = "TaxContextLoadError";
    this.service = service;
    this.cause = cause;
  }
}

export const sanitizeQueryError = (error) => ({
  name: error?.name || "Error",
  message: error?.message || "Unknown query error",
  path: error?.path,
  kind: error?.kind,
});

const loadContextPart = async (service, loader) => {
  try {
    return await loader();
  } catch (error) {
    throw new TaxContextLoadError(service, error);
  }
};

export const serializeImport = (doc) => ({
  id: String(doc._id),
  documentType: doc.documentType,
  fileName: doc.fileName,
  importedAt: doc.importedAt?.toISOString?.() || doc.importedAt,
  detectedSections: doc.detectedSections || [],
  totals: doc.totals || {},
  extractedFields: (doc.extractedFields || []).map((field) => ({
    id: field.fieldId,
    source: field.source || doc.fileName,
    label: field.label,
    path: safeFieldPath(field),
    value: field.value,
    originalValue: field.originalValue,
    mappedSection: field.mappedSection,
    mappedTaxSection: field.mappedSection,
    confidence: field.confidence,
    status: field.status,
    userOverride: field.userOverride,
    updatedAt: field.updatedAt?.toISOString?.() || field.updatedAt,
  })),
  auditTrail: (doc.auditTrail || []).map((entry) => ({
    id: entry.entryId,
    timestamp: entry.timestamp?.getTime?.() || entry.timestamp,
    label: entry.label,
    key: entry.key,
    path: entry.path,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    source: entry.source,
    actor: entry.actor,
  })),
});

export const buildImportSummary = (imports = []) => {
  const latest = imports[0] || null;
  if (!latest) return { aisImport: null, extractionReview: [] };

  const totals = imports.reduce(
    (sum, item) => ({
      tds: sum.tds + Number(item.totals?.tds || 0),
      interest: sum.interest + Number(item.totals?.interest || 0),
      dividend: sum.dividend + Number(item.totals?.dividend || 0),
      salary: sum.salary + Number(item.totals?.salary || 0),
      other: sum.other + Number(item.totals?.other || 0),
    }),
    { tds: 0, interest: 0, dividend: 0, salary: 0, other: 0 }
  );

  const detectedSections = [...new Set(imports.flatMap((item) => item.detectedSections || []))];

  const extractionReview = imports.flatMap((item) =>
    (item.extractedFields || []).filter(hasCanonicalFieldPath).map((field) => ({
      id: field.fieldId,
      source: field.source || item.fileName,
      label: field.label,
      path: safeFieldPath(field),
      value: field.value,
      originalValue: field.originalValue,
      mappedSection: field.mappedSection,
      mappedTaxSection: field.mappedSection,
      confidence: field.confidence,
      status: field.status,
      updatedAt: field.updatedAt?.toISOString?.() || field.updatedAt,
    }))
  );

  return {
    aisImport: {
      fileName: latest.fileName,
      importedAt: latest.importedAt?.toISOString?.() || latest.importedAt,
      detectedSections,
      totals,
    },
    extractionReview,
  };
};

export const applyReviewedImportsToDraft = (draft, extractionReview) => {
  const nextDraft = JSON.parse(JSON.stringify(draft || {}));

  extractionReview
    .filter(hasCanonicalFieldPath)
    .filter((field) => field.status === "confirmed" || field.status === "overridden")
    .filter((field) => !safeFieldPath(field).startsWith("deductions."))
    .forEach((field) => setPathValue(nextDraft, safeFieldPath(field), field.value));

  return nextDraft;
};

export const applyReviewedImportsToDeductions = (deductions, extractionReview) => {
  const nextDeductions = JSON.parse(JSON.stringify(deductions || {}));

  extractionReview
    .filter(hasCanonicalFieldPath)
    .filter((field) => field.status === "confirmed" || field.status === "overridden")
    .filter((field) => safeFieldPath(field).startsWith("deductions."))
    .forEach((field) =>
      setPathValue(nextDeductions, safeFieldPath(field).replace(/^deductions\./, ""), field.value)
    );

  return nextDeductions;
};

export const applyReviewedImportsByPrefix = (prefix, extractionReview) => {
  const values = {};

  extractionReview
    .filter(hasCanonicalFieldPath)
    .filter((field) => field.status === "confirmed" || field.status === "overridden")
    .filter((field) => safeFieldPath(field).startsWith(`${prefix}.`))
    .forEach((field) =>
      setPathValue(values, safeFieldPath(field).replace(new RegExp(`^${prefix}\\.`), ""), field.value)
    );

  return values;
};

const userKeys = (user) => [String(user._id), user.email, user.name].filter(Boolean);

export const userKeyInFilter = (user) => mongoose.trusted({ $in: userKeys(user) });

const plainObjectOrEmpty = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const arrayOrEmpty = (value) => (Array.isArray(value) ? value : []);

export const normalizeDraftForContext = (draft) => {
  if (!draft) return null;

  return {
    ...draft,
    salary: plainObjectOrEmpty(draft.salary),
    houseProperty: plainObjectOrEmpty(draft.houseProperty),
    pgbp: plainObjectOrEmpty(draft.pgbp),
    capitalGains: plainObjectOrEmpty(draft.capitalGains),
    otherSources: plainObjectOrEmpty(draft.otherSources),
    deductions: plainObjectOrEmpty(draft.deductions),
    taxpayerProfile: plainObjectOrEmpty(draft.taxpayerProfile),
    extractionReview: arrayOrEmpty(draft.extractionReview).filter(hasCanonicalFieldPath),
    aisImport: draft.aisImport && typeof draft.aisImport === "object" ? draft.aisImport : null,
  };
};

const serializeAuditEvent = (event) => ({
  id: String(event._id),
  eventType: event.eventType,
  entityType: event.entityType,
  entityId: event.entityId ? String(event.entityId) : null,
  fieldKey: event.fieldKey || "",
  oldValue: event.oldValue,
  newValue: event.newValue,
  sourceType: event.sourceType,
  sourceDocumentId: event.sourceDocumentId ? String(event.sourceDocumentId) : null,
  confidence: event.confidence,
  actorType: event.actorType,
  timestamp: event.timestamp?.toISOString?.() || event.timestamp,
  metadata: event.metadata || {},
});

const buildProvenanceMap = (events = []) =>
  events.reduce((map, event) => {
    if (!event.fieldKey) return map;

    const key = event.fieldKey;
    if (!map[key]) map[key] = [];
    map[key].push(serializeAuditEvent(event));

    return map;
  }, {});

export const getUserTaxContext = async (userId) => {
  if (!userId) return null;

  const cached = await getCache(cacheKey(userId));
  if (cached) return cached;

  const user = await User.findById(userId).select("name email isVerified").lean();
  if (!user) return null;

  const [draft, imports, auditEvents] = await Promise.all([
    loadContextPart("ITR draft", () => ITRDraft.findOne({ userKey: userKeyInFilter(user) }).lean()),
    loadContextPart("imported documents", () =>
      ImportedDocument.find({ userId, deletedAt: null })
        .select("-rawPreview -extractedTextPreview")
        .sort({ importedAt: -1, createdAt: -1 })
        .limit(25)
        .lean()
    ),
    loadContextPart("audit events", () =>
      AuditEvent.find({ userId })
        .select("eventType entityType entityId fieldKey oldValue newValue sourceType sourceDocumentId confidence actorType timestamp metadata")
        .sort({ timestamp: -1 })
        .limit(100)
        .lean()
    ),
  ]);

  const safeDraft = normalizeDraftForContext(draft);
  const importSummary = buildImportSummary(imports);

  const baseDraft = safeDraft
    ? {
        salary: safeDraft.salary,
        houseProperty: safeDraft.houseProperty,
        pgbp: safeDraft.pgbp,
        capitalGains: safeDraft.capitalGains,
        otherSources: safeDraft.otherSources,
      }
    : {};

  const extractionReview = importSummary.extractionReview.length
    ? importSummary.extractionReview
    : safeDraft?.extractionReview || [];

  const currentDraft = applyReviewedImportsToDraft(baseDraft, extractionReview);
  const deductions = applyReviewedImportsToDeductions(safeDraft?.deductions || {}, extractionReview);
  const taxCredits = applyReviewedImportsByPrefix("taxCredits", extractionReview);
  const importedTaxpayerProfile = applyReviewedImportsByPrefix("taxpayerProfile", extractionReview);
  const candidateAisImport = importSummary.aisImport || safeDraft?.aisImport || null;
  const aisImport = hasAisImportData(candidateAisImport) ? candidateAisImport : null;

  const hasReviewedExtraction = extractionReview.some(
    (field) => field.status === "confirmed" || field.status === "overridden"
  );

  const hasImportedDocuments = imports.some(hasImportActivity);
  const taxpayerProfile = { ...(safeDraft?.taxpayerProfile || {}), ...importedTaxpayerProfile };

  const hasTaxData =
    hasImportedDocuments ||
    hasAisImportData(aisImport) ||
    hasReviewedExtraction ||
    hasAnyAmount(deductions) ||
    hasDraftIncomeActivity(currentDraft) ||
    hasTaxpayerProfileData(taxpayerProfile);

  const context = {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
    },
    hasTaxData,
    draft: currentDraft,
    persistedDraft: safeDraft,
    deductions,
    taxpayerProfile,
    taxCredits,
    aisImport,
    extractionReview,
    imports: imports.map(serializeImport),
    provenance: buildProvenanceMap(auditEvents),
    auditTimeline: auditEvents.map(serializeAuditEvent),
    missingDocuments: [
      !aisImport ? "AIS/Form 26AS" : "",
      !hasAnyAmount(currentDraft.salary) && !aisImport ? "Form 16 or salary details" : "",
    ].filter(Boolean),
    calculationStatus: hasTaxData ? "pending_calculation" : "not_calculated",
    missingData: hasTaxData ? [] : ["income", "deductions", "importedDocuments"].filter(Boolean),
  };

  await setCache(cacheKey(userId), context, TAX_CONTEXT_CACHE_TTL_SECONDS);

  return context;
};

export const getOrCreateUserDraft = async (userId, payload = {}) => {
  const user = await User.findById(userId).select("email name").lean();
  if (!user) return null;

  return ITRDraft.findOneAndUpdate(
    { userKey: String(user._id) },
    {
      userKey: String(user._id),
      salary: payload.salary || {},
      houseProperty: payload.houseProperty || {},
      pgbp: payload.pgbp || {},
      capitalGains: payload.capitalGains || {},
      otherSources: payload.otherSources || {},
      deductions: payload.deductions || {},
      taxpayerProfile: payload.taxpayerProfile || {},
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );
};