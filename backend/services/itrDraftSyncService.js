import ITRDraft from "../models/ITRDraft.js";

const FIELD_MAP = {
  "salary.salary17_1": "salary.salary17_1",
  "salary.grossSalary": "salary.salary17_1",
  "salary.standardDeduction": "salary.standardDeduction",
  "salary.professionalTax": "salary.professionalTaxDeduction",
  "deductions.80C": "deductions.80C",
  "deductions.80D": "deductions.80D",
  "otherSources.savingsInterest": "otherSources.savingsInterest",
  "otherSources.fdInterest": "otherSources.fdInterest",
};

const setNested = (obj, path, value) => {
  const keys = path.split(".");
  let current = obj;

  keys.slice(0, -1).forEach((key) => {
    if (!current[key]) current[key] = {};
    current = current[key];
  });

  current[keys[keys.length - 1]] = String(value ?? "");
};

export const syncReviewedFieldsToITRDraft = async ({ userKey, importedDocument }) => {
  if (!userKey || !importedDocument) return null;

  const updates = {};
  const reviewedFields = [];

  const FIELD_MAP = {
  "salary.salary17_1": "salary.salary17_1",
  "salary.grossSalary": "salary.salary17_1",
  "salary.standardDeduction": "salary.standardDeduction",
  "salary.professionalTax": "salary.professionalTaxDeduction",

  "deductions.section80C": "deductions.section80C",
  "deductions.80C": "deductions.section80C",

  "deductions.healthInsurance80D": "deductions.healthInsurance80D",
  "deductions.section80D": "deductions.healthInsurance80D",
  "deductions.80D": "deductions.healthInsurance80D",

  "otherSources.savingsInterest": "otherSources.savingsInterest",
  "otherSources.fdInterest": "otherSources.fdInterest",
};

  for (const field of importedDocument.extractedFields || []) {
    if (!["confirmed", "overridden"].includes(field.status)) continue;

    const targetPath = FIELD_MAP[field.path] || FIELD_MAP[field.mappedSection];

    reviewedFields.push({
      importId: importedDocument._id,
      label: field.label,
      path: field.path,
      mappedSection: field.mappedSection,
      value: field.userOverride || field.value,
      confidence: field.confidence,
      status: field.status,
      syncedAt: new Date(),
    });

    if (targetPath) {
      setNested(updates, targetPath, field.userOverride || field.value);
    }
  }

  if (reviewedFields.length === 0) return null;

  updates.extractionReview = reviewedFields;

  return ITRDraft.findOneAndUpdate(
    { userKey },
    { $set: updates },
    { new: true, upsert: true }
  );
};