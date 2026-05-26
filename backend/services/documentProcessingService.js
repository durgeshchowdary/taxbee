import crypto from "crypto";
import { extractPdfText, isPdfMimeType } from "./pdfTextExtractor.js";
import { extractImageText, isImageMimeType } from "./imageOcrExtractor.js";
import { getOcrProviderName } from "./ocrProviderService.js";
import { PdfPageRenderError, renderPdfPagesToImages } from "./pdfPageRenderer.js";

const MAX_TEXT_PREVIEW_LENGTH = 4000;
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 128;
const MIN_EXTRACTED_TEXT_CHARS = 20;
const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/json",
  "text/csv",
  "text/plain",
  "text/tab-separated-values",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/tiff",
  "",
]);

const DOCUMENT_TYPES = {
  FORM_16: "FORM_16",
  AIS: "AIS",
  FORM_26AS: "FORM_26AS",
  SALARY_SLIP: "SALARY_SLIP",
  BANK_INTEREST_STATEMENT: "BANK_INTEREST_STATEMENT",
  INSURANCE_RECEIPT: "INSURANCE_RECEIPT",
  DONATION_RECEIPT: "DONATION_RECEIPT",
  RENT_RECEIPT: "RENT_RECEIPT",
  CAPITAL_GAINS_STATEMENT: "CAPITAL_GAINS_STATEMENT",
  TAX_STATEMENT: "TAX_STATEMENT",
  UNKNOWN: "UNKNOWN",
};

const FIELD_RULES = [
  {
    label: "Salary income",
    path: "salary.salary17_1",
    mappedSection: "Income from Salary",
    terms: ["gross salary", "salary income", "income chargeable under salaries", "total salary", "salary u/s 17"],
    documentBoost: [DOCUMENT_TYPES.FORM_16, DOCUMENT_TYPES.SALARY_SLIP],
  },
  {
    label: "Employer TAN",
    path: "taxpayerProfile.employerTan",
    mappedSection: "Employer/TDS metadata",
    terms: ["tan of deductor", "employer tan", "deductor tan", "tan"],
    valuePattern: /[A-Z]{4}\d{5}[A-Z]/i,
    documentBoost: [DOCUMENT_TYPES.FORM_16, DOCUMENT_TYPES.FORM_26AS],
  },
  {
    label: "Employer PAN",
    path: "taxpayerProfile.employerPan",
    mappedSection: "Employer metadata",
    terms: ["employer pan", "pan of employer", "deductor pan"],
    valuePattern: /[A-Z]{5}\d{4}[A-Z]/i,
    documentBoost: [DOCUMENT_TYPES.FORM_16],
  },
  {
    label: "TDS",
    path: "taxCredits.tds",
    mappedSection: "Tax Credits",
    terms: ["tds", "tax deducted", "total tax deducted", "amount of tax deducted"],
    documentBoost: [DOCUMENT_TYPES.AIS, DOCUMENT_TYPES.FORM_26AS, DOCUMENT_TYPES.FORM_16],
  },
  {
    label: "Interest income",
    path: "otherSources.fdInterest",
    mappedSection: "Income from Other Sources",
    terms: ["interest income", "bank interest", "fixed deposit interest", "interest paid", "interest credited"],
    documentBoost: [DOCUMENT_TYPES.AIS, DOCUMENT_TYPES.BANK_INTEREST_STATEMENT],
  },
  {
    label: "Dividend income",
    path: "otherSources.dividendIncome",
    mappedSection: "Income from Other Sources",
    terms: ["dividend", "dividend income"],
    documentBoost: [DOCUMENT_TYPES.AIS],
  },
  {
    label: "Section 80C",
    path: "deductions.section80C",
    mappedSection: "Deductions Chapter VI-A",
    terms: ["80c", "section 80c", "life insurance premium", "elss", "ppf", "provident fund"],
    documentBoost: [DOCUMENT_TYPES.INSURANCE_RECEIPT],
  },
  {
    label: "Section 80D",
    path: "deductions.healthInsurance",
    mappedSection: "Deductions Chapter VI-A",
    terms: ["80d", "section 80d", "health insurance", "medical insurance"],
    documentBoost: [DOCUMENT_TYPES.INSURANCE_RECEIPT],
  },
  {
    label: "Section 80G donation",
    path: "deductions.section80G",
    mappedSection: "Deductions Chapter VI-A",
    terms: ["80g", "section 80g", "donation", "donation receipt", "eligible donation"],
    documentBoost: [DOCUMENT_TYPES.DONATION_RECEIPT],
  },
  {
    label: "HRA exemption",
    path: "salary.hraExemption",
    mappedSection: "Salary Exemptions",
    terms: ["hra exemption", "house rent allowance exemption", "hra"],
    documentBoost: [DOCUMENT_TYPES.FORM_16, DOCUMENT_TYPES.RENT_RECEIPT],
  },
  {
    label: "Rent paid",
    path: "taxpayerProfile.rentPaid",
    mappedSection: "HRA/Rent",
    terms: ["rent paid", "monthly rent", "rent receipt", "house rent"],
    documentBoost: [DOCUMENT_TYPES.RENT_RECEIPT],
  },
  {
    label: "Capital gains",
    path: "capitalGains.saleValue",
    mappedSection: "Capital Gains",
    terms: ["capital gains", "sale consideration", "sale value", "broker statement", "realized gain"],
    documentBoost: [DOCUMENT_TYPES.CAPITAL_GAINS_STATEMENT, DOCUMENT_TYPES.AIS],
  },
  {
    label: "Tax paid",
    path: "taxCredits.taxPaid",
    mappedSection: "Tax Credits",
    terms: ["tax paid", "advance tax", "self assessment tax", "challan"],
    documentBoost: [DOCUMENT_TYPES.FORM_26AS],
  },
  {
    label: "Assessment year",
    path: "taxpayerProfile.assessmentYear",
    mappedSection: "Filing Metadata",
    terms: ["assessment year", "ay"],
    valuePattern: /\b20\d{2}\s*-\s*\d{2}\b/,
  },
  {
    label: "Financial year",
    path: "taxpayerProfile.financialYear",
    mappedSection: "Filing Metadata",
    terms: ["financial year", "fy", "previous year"],
    valuePattern: /\b20\d{2}\s*-\s*\d{2}\b/,
  },
];

const toNumber = (value) => {
  const number = Number(String(value ?? "").replace(/[,\s]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const normalizeText = (text = "") =>
  String(text)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const parseMaybeJson = (text) => {
  const trimmed = text.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const flattenJson = (value, prefix = "", rows = []) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenJson(item, `${prefix}.${index}`, rows));
    return rows;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, child]) => flattenJson(child, prefix ? `${prefix}.${key}` : key, rows));
    return rows;
  }
  rows.push({ key: prefix, value: String(value ?? "") });
  return rows;
};

const parseDelimitedRows = (text) => {
  const delimiter = text.includes("\t") ? "\t" : ",";
  const rows = text
    .split(/\n/)
    .map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, "")))
    .filter((row) => row.some(Boolean));
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).flatMap((row, rowIndex) =>
    headers.map((header, index) => ({
      key: `${header || `Column ${index + 1}`} row ${rowIndex + 1}`,
      value: row[index] || "",
    }))
  );
};

const detectDocumentType = ({ fileName = "", mimeType = "", text = "", structuredRows = [] }) => {
  const haystack = `${fileName} ${mimeType} ${text.slice(0, 3000)} ${structuredRows
    .slice(0, 50)
    .map((row) => `${row.key} ${row.value}`)
    .join(" ")}`.toLowerCase();

  if (haystack.includes("form 16") || haystack.includes("part b") || haystack.includes("salary u/s 17")) return DOCUMENT_TYPES.FORM_16;
  if (haystack.includes("form 26as") || haystack.includes("26as") || haystack.includes("tax credit statement")) return DOCUMENT_TYPES.FORM_26AS;
  if (haystack.includes("annual information statement") || /\bais\b/.test(haystack)) return DOCUMENT_TYPES.AIS;
  if (haystack.includes("salary slip") || haystack.includes("payslip")) return DOCUMENT_TYPES.SALARY_SLIP;
  if (haystack.includes("interest certificate") || haystack.includes("bank interest")) return DOCUMENT_TYPES.BANK_INTEREST_STATEMENT;
  if (haystack.includes("insurance") || haystack.includes("premium receipt")) return DOCUMENT_TYPES.INSURANCE_RECEIPT;
  if (haystack.includes("donation") || haystack.includes("80g")) return DOCUMENT_TYPES.DONATION_RECEIPT;
  if (haystack.includes("rent receipt") || haystack.includes("rent paid")) return DOCUMENT_TYPES.RENT_RECEIPT;
  if (haystack.includes("capital gain") || haystack.includes("broker") || haystack.includes("contract note")) return DOCUMENT_TYPES.CAPITAL_GAINS_STATEMENT;
  if (haystack.includes("tax")) return DOCUMENT_TYPES.TAX_STATEMENT;
  return DOCUMENT_TYPES.UNKNOWN;
};

const findAmountNearTerm = (text, term) => {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regexes = [
    new RegExp(`${escaped}[^\\d-]{0,80}(?:rs\\.?|inr|₹)?\\s*(-?\\d[\\d,]*(?:\\.\\d{1,2})?)`, "i"),
    new RegExp(`(?:rs\\.?|inr|₹)?\\s*(-?\\d[\\d,]*(?:\\.\\d{1,2})?)[^\\n]{0,80}${escaped}`, "i"),
  ];
  for (const regex of regexes) {
    const match = text.match(regex);
    if (match) return match[1];
  }
  return "";
};

const findValue = ({ text, structuredRows, rule }) => {
  if (rule.valuePattern) {
    const patternMatch = text.match(rule.valuePattern);
    if (patternMatch) return patternMatch[0].replace(/\s+/g, "");
  }

  for (const term of rule.terms) {
    const structured = structuredRows.find((row) => {
      const key = String(row.key || "").toLowerCase();
      const value = String(row.value || "");
      return key.includes(term) && value.trim();
    });
    if (structured) return structured.value;

    const amount = findAmountNearTerm(text, term);
    if (amount) return amount;
  }

  return "";
};

const confidenceFor = ({ value, rule, documentType, structuredRows }) => {
  if (!value) return 0;
  let confidence = structuredRows.length ? 72 : 62;
  if (rule.documentBoost?.includes(documentType)) confidence += 14;
  if (rule.valuePattern && rule.valuePattern.test(value)) confidence += 10;
  if (toNumber(value) > 0) confidence += 6;
  return Math.min(confidence, 96);
};

const totalsFromFields = (fields) =>
  fields.reduce(
    (totals, field) => {
      const amount = toNumber(field.value);
      if (field.path === "taxCredits.tds") totals.tds += amount;
      else if (field.path.includes("Interest")) totals.interest += amount;
      else if (field.path === "otherSources.fdInterest" || field.path === "otherSources.savingsInterest") totals.interest += amount;
      else if (field.path === "otherSources.dividendIncome") totals.dividend += amount;
      else if (field.path.startsWith("salary.")) totals.salary += amount;
      else if (amount > 0) totals.other += amount;
      return totals;
    },
    { tds: 0, interest: 0, dividend: 0, salary: 0, other: 0 }
  );

const detectedSectionsFromFields = (fields, documentType) => {
  const sections = new Set();
  if (documentType !== DOCUMENT_TYPES.UNKNOWN) sections.add(documentType.replaceAll("_", " "));
  fields.forEach((field) => {
    if (field.mappedSection) sections.add(field.mappedSection);
  });
  return Array.from(sections);
};

export const validateUpload = ({ fileName = "", mimeType = "", sizeBytes = 0 }) => {
  if (!fileName) {
    return { ok: false, status: 400, message: "fileName is required" };
  }
  if (String(fileName).length > 180 || /[\\/:*?"<>|]/.test(String(fileName))) {
    return { ok: false, status: 400, message: "fileName contains unsupported characters" };
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, status: 413, message: "File is too large. Upload documents up to 6 MB." };
  }
  if (sizeBytes < 0) {
    return { ok: false, status: 400, message: "Invalid file size" };
  }
  const lowerName = fileName.toLowerCase();
  const extensionAllowed = /\.(json|csv|tsv|txt|pdf|png|jpe?g|webp|tiff?)$/i.test(lowerName);
  if (!SUPPORTED_MIME_TYPES.has(String(mimeType).toLowerCase()) || !extensionAllowed) {
    return {
      ok: false,
      status: 415,
      message: "Unsupported file type. Upload PDF, image, JSON, CSV, TSV, or TXT.",
    };
  }
  return { ok: true };
};

const decodeBase64 = (fileBase64 = "") => {
  const cleaned = String(fileBase64).replace(/^data:[^;]+;base64,/, "");
  if (!cleaned) return null;
  if (cleaned.length > MAX_BASE64_CHARS || !/^[A-Za-z0-9+/=\s]+$/.test(cleaned)) {
    const error = new Error("Invalid or oversized base64 upload payload");
    error.status = 413;
    throw error;
  }
  return Buffer.from(cleaned, "base64");
};

const hasExpectedSignature = ({ buffer, mimeType = "", fileName = "" }) => {
  if (!buffer) return true;
  const name = String(fileName).toLowerCase();
  const type = String(mimeType).toLowerCase();
  const hex = buffer.subarray(0, 12).toString("hex");
  const ascii = buffer.subarray(0, 12).toString("ascii");

  if (type === "application/pdf" || name.endsWith(".pdf")) return ascii.startsWith("%PDF-");
  if (type === "image/png" || name.endsWith(".png")) return hex.startsWith("89504e470d0a1a0a");
  if (type === "image/jpeg" || type === "image/jpg" || /\.jpe?g$/i.test(name)) return hex.startsWith("ffd8ff");
  if (type === "image/webp" || name.endsWith(".webp")) return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP";
  if (type === "image/tiff" || /\.tiff?$/i.test(name)) return hex.startsWith("49492a00") || hex.startsWith("4d4d002a");
  return true;
};

const extractScannedPdfText = async ({ buffer, fileName, pdfResult }) => {
  let rendered;
  try {
    rendered = await renderPdfPagesToImages({ buffer, fileName });
  } catch (error) {
    const known = error instanceof PdfPageRenderError;
    return {
      text: "",
      extractionMetadata: {
        ...pdfResult.metadata,
        extractionMode: "ocr_pdf_render_failed",
        ocrAttempted: true,
        ocrProvider: getOcrProviderName(),
        ocrCode: known ? error.code : "PDF_PAGE_RENDER_FAILED",
        renderStatus: known ? error.status : 422,
      },
      extractionWarnings: [
        ...pdfResult.warnings,
        known ? error.message : "PDF page rendering failed before OCR could run.",
      ],
    };
  }
  const pageResults = [];
  const textParts = [];

  for (const image of rendered.images) {
    const ocrResult = await extractImageText({
      buffer: image.buffer,
      mimeType: image.mimeType,
      fileName: image.fileName,
    });
    pageResults.push({
      pageNumber: image.pageNumber,
      textLength: ocrResult.text.length,
      confidence: ocrResult.metadata?.confidence ?? null,
      code: ocrResult.metadata?.code,
      engine: ocrResult.metadata?.ocrEngine,
    });
    if (ocrResult.text.trim()) {
      textParts.push(`Page ${image.pageNumber}\n${ocrResult.text.trim()}`);
    }
  }

  const confidences = pageResults
    .map((item) => Number(item.confidence))
    .filter((item) => Number.isFinite(item));
  const confidenceAverage = confidences.length
    ? Math.round(confidences.reduce((total, item) => total + item, 0) / confidences.length)
    : null;
  const failedPage = pageResults.find((item) => item.code);

  return {
    text: textParts.join("\n\n").trim(),
    extractionMetadata: {
      ...pdfResult.metadata,
      extractionMode: textParts.length ? "ocr_pdf_pages" : "ocr_pdf_failed",
      ocrAttempted: true,
      ocrCode: failedPage?.code,
      ocrProvider: getOcrProviderName(),
      ocrEngine: pageResults.find((item) => item.engine)?.engine || null,
      confidence: confidenceAverage,
      pageCount: rendered.metadata.pageCount,
      pagesRead: pdfResult.metadata.pagesRead,
      pagesRendered: rendered.metadata.pagesRendered,
      pdfRenderer: rendered.metadata.rendererEngine,
      truncated: Boolean(pdfResult.metadata.truncated || rendered.metadata.truncated),
      pageOcr: pageResults,
    },
    extractionWarnings: [...pdfResult.warnings, ...rendered.warnings],
  };
};

export const extractDocumentText = async ({ fileName, mimeType = "", text = "", fileBase64 = "" }) => {
  const suppliedText = normalizeText(text);
  const buffer = decodeBase64(fileBase64);
  const sizeBytes = buffer?.length || Buffer.byteLength(String(text || ""), "utf8");
  const validation = validateUpload({ fileName, mimeType, sizeBytes });
  if (!validation.ok) {
    const error = new Error(validation.message);
    error.status = validation.status;
    throw error;
  }
  if (!hasExpectedSignature({ buffer, mimeType, fileName })) {
    const error = new Error("File content does not match the declared type");
    error.status = 415;
    throw error;
  }

  if (isPdfMimeType(mimeType, fileName) && buffer) {
    const pdfResult = await extractPdfText({ buffer, fileName });
    if (pdfResult.text.length >= MIN_EXTRACTED_TEXT_CHARS) {
      return {
        text: pdfResult.text,
        extractionMetadata: { ...pdfResult.metadata, extractionMode: "pdf_text" },
        extractionWarnings: pdfResult.warnings,
      };
    }

    if (getOcrProviderName() === "none") {
      const ocrResult = await extractImageText({ buffer, mimeType, fileName });
      return {
        text: ocrResult.text,
        extractionMetadata: {
          ...pdfResult.metadata,
          ocrFallback: ocrResult.metadata,
          ocrAttempted: true,
          ocrCode: ocrResult.metadata?.code,
          extractionMode: ocrResult.text ? "ocr_fallback" : "pdf_text_failed",
        },
        extractionWarnings: [...pdfResult.warnings, ...ocrResult.warnings],
      };
    }

    return extractScannedPdfText({ buffer, fileName, pdfResult });
  }

  if (isImageMimeType(mimeType, fileName) && buffer) {
    const ocrResult = await extractImageText({ buffer, mimeType, fileName });
    return {
      text: ocrResult.text,
      extractionMetadata: {
        ...ocrResult.metadata,
        ocrAttempted: true,
        ocrCode: ocrResult.metadata?.code,
        extractionMode: ocrResult.text ? "ocr_image" : "ocr_failed",
      },
      extractionWarnings: ocrResult.warnings,
    };
  }

  return {
    text: suppliedText,
    extractionMetadata: { extractor: "browserTextUpload", extractionMode: "supplied_text", sizeBytes },
    extractionWarnings: [],
  };
};

export const processTaxDocument = ({ fileName, mimeType = "", text = "", extractionMetadata = {}, extractionWarnings = [] }) => {
  const normalizedText = normalizeText(text);
  const parsedJson = parseMaybeJson(normalizedText);
  const structuredRows = parsedJson
    ? flattenJson(parsedJson)
    : parseDelimitedRows(normalizedText);
  const searchableText = parsedJson
    ? `${normalizedText}\n${structuredRows.map((row) => `${row.key}: ${row.value}`).join("\n")}`
    : normalizedText;
  const documentType = detectDocumentType({
    fileName,
    mimeType,
    text: searchableText,
    structuredRows,
  });

  const extractedFields = FIELD_RULES.map((rule) => {
    const value = findValue({ text: searchableText, structuredRows, rule });
    if (!value) return null;
    const confidence = confidenceFor({ value, rule, documentType, structuredRows });
    return {
      fieldId: `${crypto.randomUUID()}:${rule.path}`,
      source: fileName,
      label: rule.label,
      path: rule.path,
      value: String(value).trim(),
      originalValue: String(value).trim(),
      mappedSection: rule.mappedSection,
      confidence,
      status: "extracted",
      userOverride: "",
      updatedAt: new Date(),
    };
  }).filter(Boolean);

  const detectedSections = detectedSectionsFromFields(extractedFields, documentType);
  const auditTrail = extractedFields.map((field) => ({
    entryId: crypto.randomUUID(),
    timestamp: new Date(),
    label: `Document parser extracted ${field.label}`,
    key: "importedDocument",
    path: field.path,
    oldValue: "",
    newValue: field.value,
    source: fileName,
    actor: "parser",
  }));

  return {
    documentType,
    mimeType,
    fileName,
    importedAt: new Date(),
    reviewStatus: "extracted",
    detectedSections,
    totals: totalsFromFields(extractedFields),
    extractedFields,
    auditTrail,
    extractedTextPreview: searchableText.slice(0, MAX_TEXT_PREVIEW_LENGTH),
    sourceMetadata: {
      parserVersion: "documentProcessingService.v1",
      parserMode: parsedJson ? "json" : structuredRows.length ? "delimited-text" : "plain-text",
      ocrRequired: /pdf|image/i.test(mimeType) && !normalizedText,
      extractedFieldCount: extractedFields.length,
      extraction: extractionMetadata,
      extractionWarnings,
    },
    rawPreview: parsedJson ? { kind: "json", keys: structuredRows.slice(0, 25) } : null,
  };
};
