import crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-1.5-flash";

const TAXBEE_FIELD_CATALOG = [
  {
    label: "Salary income",
    path: "salary.salary17_1",
    mappedSection: "Income from Salary",
  },
  {
    label: "Employer TAN",
    path: "taxpayerProfile.employerTan",
    mappedSection: "Employer/TDS metadata",
  },
  {
    label: "Employer PAN",
    path: "taxpayerProfile.employerPan",
    mappedSection: "Employer metadata",
  },
  {
    label: "TDS",
    path: "taxCredits.tds",
    mappedSection: "Tax Credits",
  },
  {
    label: "Interest income",
    path: "otherSources.fdInterest",
    mappedSection: "Income from Other Sources",
  },
  {
    label: "Dividend income",
    path: "otherSources.dividendIncome",
    mappedSection: "Income from Other Sources",
  },
  {
    label: "Section 80C",
    path: "deductions.section80C",
    mappedSection: "Deductions Chapter VI-A",
  },
  {
    label: "Section 80D",
    path: "deductions.healthInsurance",
    mappedSection: "Deductions Chapter VI-A",
  },
  {
    label: "Section 80G donation",
    path: "deductions.section80G",
    mappedSection: "Deductions Chapter VI-A",
  },
  {
    label: "HRA exemption",
    path: "salary.hraExemption",
    mappedSection: "Salary Exemptions",
  },
  {
    label: "Rent paid",
    path: "taxpayerProfile.rentPaid",
    mappedSection: "HRA/Rent",
  },
  {
    label: "Capital gains",
    path: "capitalGains.saleValue",
    mappedSection: "Capital Gains",
  },
  {
    label: "Tax paid",
    path: "taxCredits.taxPaid",
    mappedSection: "Tax Credits",
  },
  {
    label: "Assessment year",
    path: "taxpayerProfile.assessmentYear",
    mappedSection: "Filing Metadata",
  },
  {
    label: "Financial year",
    path: "taxpayerProfile.financialYear",
    mappedSection: "Filing Metadata",
  },
];

export const isGeminiExtractionEnabled = () =>
  String(process.env.GEMINI_EXTRACTION_ENABLED || "false").toLowerCase() === "true";

const getApiKey = () => process.env.GEMINI_API_KEY || "";

const getModelName = () =>
  process.env.GEMINI_EXTRACTION_MODEL || DEFAULT_MODEL;

const clampText = (text = "", maxChars = 18000) =>
  String(text || "").slice(0, maxChars);

const extractJsonObject = (raw = "") => {
  const text = String(raw || "").trim();

  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || text;

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
};

const normalizeDocumentType = (value = "") => {
  const normalized = String(value || "").toUpperCase().replace(/\s+/g, "_");

  if (normalized.includes("FORM_16")) return "FORM_16";
  if (normalized.includes("26AS")) return "FORM_26AS";
  if (normalized.includes("AIS")) return "AIS";
  if (normalized.includes("SALARY")) return "SALARY_SLIP";
  if (normalized.includes("INTEREST")) return "BANK_INTEREST_STATEMENT";
  if (normalized.includes("INSURANCE")) return "INSURANCE_RECEIPT";
  if (normalized.includes("DONATION") || normalized.includes("80G")) return "DONATION_RECEIPT";
  if (normalized.includes("RENT")) return "RENT_RECEIPT";
  if (normalized.includes("CAPITAL")) return "CAPITAL_GAINS_STATEMENT";
  if (normalized.includes("TAX")) return "TAX_STATEMENT";

  return "UNKNOWN";
};

const normalizeConfidence = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 70;
  return Math.max(0, Math.min(96, Math.round(number)));
};

const cleanValue = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, 1000);
};

const normalizeGeminiFields = ({ fields = [], fileName = "" }) => {
  const allowedByPath = new Map(TAXBEE_FIELD_CATALOG.map((field) => [field.path, field]));

  return fields
    .map((field) => {
      const path = String(field.path || "").trim();
      const catalog = allowedByPath.get(path);

      if (!catalog) return null;

      const value = cleanValue(field.value);
      if (!value) return null;

      return {
        fieldId: `${crypto.randomUUID()}:${path}`,
        source: fileName,
        label: catalog.label,
        path,
        value,
        originalValue: value,
        mappedSection: catalog.mappedSection,
        confidence: normalizeConfidence(field.confidence),
        status: "extracted",
        userOverride: "",
        updatedAt: new Date(),
      };
    })
    .filter(Boolean);
};

const buildGeminiPrompt = ({ fileName, mimeType, text }) => `
You are TaxBee's Indian income-tax document extraction engine.

Extract tax fields from the supplied document text.

Return ONLY valid JSON. No markdown. No explanation.

Allowed documentType values:
FORM_16, AIS, FORM_26AS, SALARY_SLIP, BANK_INTEREST_STATEMENT,
INSURANCE_RECEIPT, DONATION_RECEIPT, RENT_RECEIPT,
CAPITAL_GAINS_STATEMENT, TAX_STATEMENT, UNKNOWN

Only use these TaxBee field paths:
${TAXBEE_FIELD_CATALOG.map(
  (field) => `- ${field.path} = ${field.label} (${field.mappedSection})`
).join("\n")}

Return shape:
{
  "documentType": "FORM_16",
  "confidence": 0-96,
  "warnings": ["string"],
  "fields": [
    {
      "path": "salary.salary17_1",
      "value": "850000",
      "confidence": 0-96
    }
  ]
}

Rules:
- Do not invent values.
- If a value is missing, do not include that field.
- Prefer numeric values without commas for money.
- PAN/TAN should be uppercase.
- Use Indian tax context.
- The user will review every field before filing.

File name: ${fileName}
MIME type: ${mimeType}

Document text:
${clampText(text)}
`;

export const extractTaxFieldsWithGemini = async ({
  fileName = "",
  mimeType = "",
  text = "",
} = {}) => {
  if (!isGeminiExtractionEnabled()) {
    return {
      used: false,
      ok: false,
      reason: "GEMINI_EXTRACTION_DISABLED",
    };
  }

  if (!getApiKey()) {
    return {
      used: true,
      ok: false,
      reason: "GEMINI_API_KEY_MISSING",
    };
  }

  const normalizedText = String(text || "").trim();

  if (normalizedText.length < 20) {
    return {
      used: true,
      ok: false,
      reason: "INSUFFICIENT_TEXT_FOR_GEMINI",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(getApiKey());
    const model = genAI.getGenerativeModel({
      model: getModelName(),
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(
      buildGeminiPrompt({ fileName, mimeType, text: normalizedText })
    );

    const rawText = result.response.text();
    const parsed = extractJsonObject(rawText);

    if (!parsed || typeof parsed !== "object") {
      return {
        used: true,
        ok: false,
        reason: "GEMINI_JSON_PARSE_FAILED",
        rawPreview: rawText.slice(0, 500),
      };
    }

    const extractedFields = normalizeGeminiFields({
      fields: Array.isArray(parsed.fields) ? parsed.fields : [],
      fileName,
    });

    if (extractedFields.length === 0) {
      return {
        used: true,
        ok: false,
        reason: "GEMINI_NO_FIELDS",
        documentType: normalizeDocumentType(parsed.documentType),
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
      };
    }

    return {
      used: true,
      ok: true,
      provider: "gemini",
      model: getModelName(),
      documentType: normalizeDocumentType(parsed.documentType),
      confidence: normalizeConfidence(parsed.confidence),
      extractedFields,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String).slice(0, 10) : [],
    };
  } catch (error) {
    return {
      used: true,
      ok: false,
      reason: "GEMINI_EXTRACTION_FAILED",
      errorMessage: String(error?.message || error).slice(0, 500),
    };
  }
};