'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STORAGE_KEYS } from '@/backend/utils/siteMap';

const INCOME_TAX_PORTAL_URL = 'https://www.incometax.gov.in/iec/foportal/';
const AIS_PORTAL_URL = 'https://ais.insight.gov.in/complianceportal/ais';

const maskPan = (pan: string) => {
  const normalized = pan.toUpperCase();
  if (normalized.length < 5) return normalized;
  return `${normalized.slice(0, 2)}*****${normalized.slice(-3)}`;
};

const isValidPan = (value: string) =>
  /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.trim().toUpperCase());

type AisImportSummary = {
  fileName: string;
  importedAt: string;
  detectedSections: string[];
  totals: {
    tds: number;
    interest: number;
    dividend: number;
    salary: number;
    other: number;
  };
  rawPreview: unknown;
};
type PersistedImport = {
  id: string;
  documentType: string;
  fileName: string;
  importedAt: string;
  reviewStatus?: string;
  detectedSections: string[];
  totals: AisImportSummary['totals'];
  extractedFields: ExtractionReviewRecord[];
  auditTrail?: AuditEntry[];
  rawPreview?: unknown;
  sourceMetadata?: {
    jobId?: string;
    processingStatus?: string;
    failureCode?: string;
    failureReason?: string;
    extraction?: {
      extractionMode?: string;
      ocrCode?: string;
      ocrEngine?: string;
    };
  };
};

type DraftImport = {
  salary: {
    salary17_1: string;
    perquisites17_2: string;
    profits17_3: string;
    exemptions10: string;
    deductions16: string;
  };
  houseProperty: {
    annualRent: string;
    municipalTax: string;
    interestOnLoan: string;
  };
  pgbp: {
    businessReceipts: string;
    businessExpenses: string;
    otherBusinessIncome: string;
    depreciation: string;
  };
  capitalGains: {
    saleValue: string;
    costOfAcquisition: string;
    transferExpenses: string;
  };
  otherSources: {
    savingsInterest: string;
    fdInterest: string;
    dividendIncome: string;
    otherIncome: string;
  };
};

type AisIntelligence = {
  mappedHeads: string[];
  warnings: string[];
  documents: string[];
  nextActions: string[];
};
type ExtractionReviewRecord = {
  id: string;
  source: string;
  label: string;
  path: string;
  value: string;
  originalValue: string;
  mappedSection: string;
  confidence: number;
  status: 'extracted' | 'confirmed' | 'overridden';
  updatedAt: string;
};
type AuditEntry = {
  id: string;
  timestamp: number;
  label: string;
  key: string;
  path: string;
  oldValue: unknown;
  newValue: string;
  source: string;
  actor: 'parser' | 'user';
};

const getAuthHeaders = () => {
  return { 'Content-Type': 'application/json' };
};

const normalizeDocumentType = (fileName: string, detectedSections: string[]) => {
  const normalized = `${fileName} ${detectedSections.join(' ')}`.toUpperCase();
  if (normalized.includes('FORM 16') || normalized.includes('FORM_16')) return 'FORM_16';
  if (normalized.includes('26AS')) return 'FORM_26AS';
  if (normalized.includes('AIS')) return 'AIS';
  return 'TAX_STATEMENT';
};

const fileSignature = async (file: File) => {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ');
};

const looksLikeEncryptedAisUtilityJson = (text: string) =>
  /^[a-f0-9]{64}[A-Za-z0-9+/=]+$/i.test(text.replace(/\s/g, ''));

const tryDecryptEncryptedAisJson = async (encryptedText: string, password: string, pan: string) => {
  const res = await fetch('/api/ais/decrypt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ encryptedText, password, pan }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('The AIS password did not match this encrypted JSON file.');
    }

    if (res.status === 422) {
      throw new Error(data.message || 'TaxBee could not decrypt this AIS Utility JSON format yet.');
    }

    throw new Error(data.message || 'Encrypted AIS decrypt failed.');
  }

  return data.data;
};

const toNumber = (value: unknown) => {
  const number = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(number) ? number : 0;
};

const toAmountString = (value: number) => (value > 0 ? String(Math.round(value)) : '');

const appendAuditEntries = (entries: AuditEntry[]) => {
  void entries;
};

const parseDelimitedLine = (line: string, delimiter: string) => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const parseDelimitedAisExport = (text: string, fileName: string) => {
  const delimiter = fileName.toLowerCase().endsWith('.tsv') || text.includes('\t') ? '\t' : ',';
  const rows = text
    .split(/\r?\n/)
    .map((line) => parseDelimitedLine(line, delimiter))
    .filter((row) => row.some(Boolean));

  if (rows.length < 2) return null;

  const headers = rows[0].map((header, index) => header || `Column ${index + 1}`);
  return rows.slice(1).map((row) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = row[index] || '';
      return record;
    }, {})
  );
};

const parseLooseTextAisExport = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const records = lines
    .map((line) => {
      const match = line.match(/^([^:=-]{3,80})\s*[:=-]\s*(.+)$/);
      if (!match) return null;
      return {
        description: match[1].trim(),
        amount: match[2].trim(),
      };
    })
    .filter((record): record is { description: string; amount: string } => Boolean(record));

  return records.length ? records : null;
};

const parseReadableAisExport = (text: string, fileName: string) => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }

  const delimited = parseDelimitedAisExport(trimmed, fileName);
  if (delimited) return delimited;

  return parseLooseTextAisExport(trimmed);
};

const findAmountAfterTerms = (text: string, terms: string[]) => {
  const normalized = text.replace(/,/g, '');
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = normalized.match(new RegExp(`${escaped}[^0-9-]{0,80}(-?\\d+(?:\\.\\d+)?)`, 'i'));
    if (match) return toNumber(match[1]);
  }
  return 0;
};

const parseReadableForm16Export = (text: string, fileName: string) => {
  const salary17_1 = findAmountAfterTerms(text, [
    'salary u/s 17(1)',
    'salary under section 17(1)',
    'gross salary',
    'basic salary',
  ]);
  const perquisites17_2 = findAmountAfterTerms(text, ['perquisites u/s 17(2)', 'perquisites']);
  const profits17_3 = findAmountAfterTerms(text, ['profits in lieu of salary', '17(3)']);
  const exemptions10 = findAmountAfterTerms(text, ['exemptions u/s 10', 'section 10']);
  const deductions16 = findAmountAfterTerms(text, [
    'deductions u/s 16',
    'standard deduction',
    'professional tax',
  ]);
  const tds = findAmountAfterTerms(text, [
    'tax deducted at source',
    'tds',
    'total tax deducted',
  ]);

  if (!salary17_1 && !tds && !deductions16) return null;

  return {
    fileName,
    importedAt: new Date().toISOString(),
    detectedSections: ['Salary', 'TDS/TCS', 'Form 16'],
    totals: {
      tds,
      interest: 0,
      dividend: 0,
      salary: salary17_1 + perquisites17_2 + profits17_3,
      other: 0,
    },
    rawPreview: {
      documentType: 'Form 16',
      extractedTextPreview: text.slice(0, 1000),
    },
    form16Draft: {
      salary: {
        salary17_1: toAmountString(salary17_1),
        perquisites17_2: toAmountString(perquisites17_2),
        profits17_3: toAmountString(profits17_3),
        exemptions10: toAmountString(exemptions10),
        deductions16: toAmountString(deductions16),
      },
      houseProperty: {
        annualRent: '',
        municipalTax: '',
        interestOnLoan: '',
      },
      pgbp: {
        businessReceipts: '',
        businessExpenses: '',
        otherBusinessIncome: '',
        depreciation: '',
      },
      capitalGains: {
        saleValue: '',
        costOfAcquisition: '',
        transferExpenses: '',
      },
      otherSources: {
        savingsInterest: '',
        fdInterest: '',
        dividendIncome: '',
        otherIncome: '',
      },
    } satisfies DraftImport,
  };
};

const findLargestAmountByTerms = (data: unknown, terms: string[], excludeTerms: string[] = []) => {
  let largest = 0;

  const visit = (value: unknown, context = '') => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, context));
      return;
    }

    if (!value || typeof value !== 'object') return;

    const record = value as Record<string, unknown>;
    const recordText = `${context} ${Object.entries(record)
      .map(([key, child]) => `${key} ${typeof child === 'string' || typeof child === 'number' ? child : ''}`)
      .join(' ')}`.toLowerCase();

    const matches = terms.some((term) => recordText.includes(term));
    const excluded = excludeTerms.some((term) => recordText.includes(term));

    Object.entries(record).forEach(([key, child]) => {
      const keyText = `${context} ${key}`.toLowerCase();
      if (typeof child === 'number' || (typeof child === 'string' && /^\s*[\d,]+(?:\.\d+)?\s*$/.test(child))) {
        const amount = toNumber(child);
        const childMatches = terms.some((term) => keyText.includes(term)) || matches;
        const childExcluded = excludeTerms.some((term) => keyText.includes(term)) || excluded;
        if (childMatches && !childExcluded && amount > largest) {
          largest = amount;
        }
      }

      visit(child, `${context} ${key}`);
    });
  };

  visit(data);
  return largest;
};

const sumAmountsByTerms = (data: unknown, terms: string[], excludeTerms: string[] = []) => {
  let total = 0;

  const visit = (value: unknown, context = '') => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, context));
      return;
    }

    if (!value || typeof value !== 'object') return;

    const record = value as Record<string, unknown>;
    const recordText = `${context} ${Object.entries(record)
      .map(([key, child]) => `${key} ${typeof child === 'string' || typeof child === 'number' ? child : ''}`)
      .join(' ')}`.toLowerCase();
    const matches = terms.some((term) => recordText.includes(term));
    const excluded = excludeTerms.some((term) => recordText.includes(term));

    Object.entries(record).forEach(([key, child]) => {
      const keyText = `${context} ${key}`.toLowerCase();
      const childMatches = terms.some((term) => keyText.includes(term)) || matches;
      const childExcluded = excludeTerms.some((term) => keyText.includes(term)) || excluded;

      if (typeof child === 'number' || (typeof child === 'string' && /^\s*[\d,]+(?:\.\d+)?\s*$/.test(child))) {
        const amount = toNumber(child);
        if (childMatches && !childExcluded && amount > 0) {
          total += amount;
        }
      }

      visit(child, `${context} ${key}`);
    });
  };

  visit(data);
  return total;
};

const buildDraftFromAis = (data: unknown, summary: AisImportSummary): DraftImport => {
  const salary =
    findLargestAmountByTerms(data, ['salary', 'income from salary', 'section 17'], ['tds', 'tax deducted']) ||
    summary.totals.salary;
  const perquisites = findLargestAmountByTerms(data, ['perquisite', '17(2)']);
  const profits = findLargestAmountByTerms(data, ['profits in lieu', '17(3)']);
  const exemptions = findLargestAmountByTerms(data, ['exemption', 'hra', 'section 10']);
  const deductions16 = findLargestAmountByTerms(data, ['deduction u/s 16', 'standard deduction', 'professional tax']);
  const savingsInterest = sumAmountsByTerms(data, ['savings interest', 'saving bank interest'], ['tds', 'tax deducted']);
  const fdInterest =
    sumAmountsByTerms(data, ['fixed deposit interest', 'time deposit interest', 'deposit interest'], [
      'tds',
      'tax deducted',
      'savings',
      'saving bank',
    ]) ||
    findLargestAmountByTerms(data, ['interest'], ['tds', 'tax deducted', 'savings', 'saving bank']) ||
    summary.totals.interest;
  const dividend =
    sumAmountsByTerms(data, ['dividend'], ['tds', 'tax deducted']) ||
    findLargestAmountByTerms(data, ['dividend'], ['tds', 'tax deducted']) ||
    summary.totals.dividend;
  const rent = findLargestAmountByTerms(data, ['rent received', 'rental income', 'house property'], [
    'tds',
    'tax deducted',
    'interest',
  ]);
  const municipalTax = findLargestAmountByTerms(data, ['municipal tax', 'property tax']);
  const homeLoanInterest = findLargestAmountByTerms(data, ['housing loan interest', 'interest on loan', 'home loan interest']);
  const businessReceipts = sumAmountsByTerms(data, ['business receipt', 'professional receipt', 'gross receipt']);
  const businessExpenses = sumAmountsByTerms(data, ['business expense', 'professional expense', 'expense']);
  const depreciation = findLargestAmountByTerms(data, ['depreciation']);
  const otherBusinessIncome = sumAmountsByTerms(data, ['business income', 'professional income'], [
    'receipt',
    'expense',
    'depreciation',
  ]);
  const saleValue = sumAmountsByTerms(data, ['sale consideration', 'sale value', 'full value of consideration', 'capital gain']);
  const costOfAcquisition = sumAmountsByTerms(data, ['cost of acquisition', 'purchase cost', 'indexed cost']);
  const transferExpenses = sumAmountsByTerms(data, ['transfer expense', 'brokerage', 'stamp duty']);
  const otherIncome = sumAmountsByTerms(data, ['other income', 'income from other sources'], [
    'interest',
    'dividend',
    'tds',
    'tax deducted',
  ]);

  return {
    salary: {
      salary17_1: toAmountString(salary),
      perquisites17_2: toAmountString(perquisites),
      profits17_3: toAmountString(profits),
      exemptions10: toAmountString(exemptions),
      deductions16: toAmountString(deductions16),
    },
    houseProperty: {
      annualRent: toAmountString(rent),
      municipalTax: toAmountString(municipalTax),
      interestOnLoan: toAmountString(homeLoanInterest),
    },
    pgbp: {
      businessReceipts: toAmountString(businessReceipts),
      businessExpenses: toAmountString(businessExpenses),
      otherBusinessIncome: toAmountString(otherBusinessIncome),
      depreciation: toAmountString(depreciation),
    },
    capitalGains: {
      saleValue: toAmountString(saleValue),
      costOfAcquisition: toAmountString(costOfAcquisition),
      transferExpenses: toAmountString(transferExpenses),
    },
    otherSources: {
      savingsInterest: toAmountString(savingsInterest),
      fdInterest: toAmountString(fdInterest),
      dividendIncome: toAmountString(dividend),
      otherIncome: toAmountString(otherIncome),
    },
  };
};

const extractionFields: Array<{
  label: string;
  path: string;
  mappedSection: string;
  confidence: number;
}> = [
  { label: 'Salary u/s 17(1)', path: 'salary.salary17_1', mappedSection: 'Income from Salary', confidence: 88 },
  { label: 'Perquisites u/s 17(2)', path: 'salary.perquisites17_2', mappedSection: 'Income from Salary', confidence: 78 },
  { label: 'Profits in lieu u/s 17(3)', path: 'salary.profits17_3', mappedSection: 'Income from Salary', confidence: 76 },
  { label: 'Exemptions u/s 10', path: 'salary.exemptions10', mappedSection: 'Income from Salary', confidence: 74 },
  { label: 'Deductions u/s 16', path: 'salary.deductions16', mappedSection: 'Income from Salary', confidence: 82 },
  { label: 'House property annual rent', path: 'houseProperty.annualRent', mappedSection: 'House Property', confidence: 76 },
  { label: 'Municipal tax', path: 'houseProperty.municipalTax', mappedSection: 'House Property', confidence: 68 },
  { label: 'Interest on housing loan', path: 'houseProperty.interestOnLoan', mappedSection: 'House Property', confidence: 75 },
  { label: 'Business receipts', path: 'pgbp.businessReceipts', mappedSection: 'Business/Profession', confidence: 70 },
  { label: 'Business expenses', path: 'pgbp.businessExpenses', mappedSection: 'Business/Profession', confidence: 64 },
  { label: 'Other business income', path: 'pgbp.otherBusinessIncome', mappedSection: 'Business/Profession', confidence: 64 },
  { label: 'Depreciation', path: 'pgbp.depreciation', mappedSection: 'Business/Profession', confidence: 60 },
  { label: 'Capital gains sale value', path: 'capitalGains.saleValue', mappedSection: 'Capital Gains', confidence: 72 },
  { label: 'Cost of acquisition', path: 'capitalGains.costOfAcquisition', mappedSection: 'Capital Gains', confidence: 67 },
  { label: 'Transfer expenses', path: 'capitalGains.transferExpenses', mappedSection: 'Capital Gains', confidence: 64 },
  { label: 'Savings interest', path: 'otherSources.savingsInterest', mappedSection: 'Other Sources', confidence: 90 },
  { label: 'Fixed deposit interest', path: 'otherSources.fdInterest', mappedSection: 'Other Sources', confidence: 86 },
  { label: 'Dividend income', path: 'otherSources.dividendIncome', mappedSection: 'Other Sources', confidence: 84 },
  { label: 'Other income', path: 'otherSources.otherIncome', mappedSection: 'Other Sources', confidence: 66 },
];

const getPathValue = (record: Record<string, unknown>, path: string) =>
  path.split('.').reduce<unknown>((value, segment) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[segment];
  }, record);

const buildExtractionReviewRecords = (
  importedDraft: DraftImport,
  summary: AisImportSummary
): ExtractionReviewRecord[] => {
  const records: ExtractionReviewRecord[] = [];

  extractionFields.forEach((field) => {
      const value = String(getPathValue(importedDraft as unknown as Record<string, unknown>, field.path) || '');
      if (!value) return;

      records.push({
        id: `${summary.fileName}:${field.path}`,
        source: summary.fileName,
        label: field.label,
        path: field.path,
        value,
        originalValue: value,
        mappedSection: field.mappedSection,
        confidence: field.confidence,
        status: 'extracted',
        updatedAt: summary.importedAt,
      });
    });

  return records;
};

const buildParserAuditEntries = (records: ExtractionReviewRecord[]): AuditEntry[] =>
  records.map((record) => ({
    id: `${Date.now()}-${record.id}-parser`,
    timestamp: Date.now(),
    label: `Parser extracted ${record.label}`,
    key: STORAGE_KEYS.EXTRACTION_REVIEW,
    path: record.path,
    oldValue: '',
    newValue: record.value,
    source: record.source,
    actor: 'parser' as const,
  }));

const saveExtractionReviewRecords = (records: ExtractionReviewRecord[]) => {
  void records;
};

const applyConfirmedExtractionsToTaxBeeHeads = (records: ExtractionReviewRecord[]) => {
  const auditEntries: AuditEntry[] = [];

  records
    .filter((record) => record.status === 'confirmed' || record.status === 'overridden')
    .forEach((record) => {
      auditEntries.push({
        id: `${Date.now()}-${record.id}-${record.status}`,
        timestamp: Date.now(),
        label:
          record.status === 'overridden'
            ? `User overrode ${record.label}`
            : `User confirmed ${record.label}`,
        key: STORAGE_KEYS.ITR_DRAFT,
        path: record.path,
        oldValue: record.originalValue,
        newValue: record.value,
        source: record.source,
        actor: 'user',
      });
    });

  appendAuditEntries(auditEntries);
  return auditEntries;
};

const applyAisToTaxBeeHeads = (data: unknown, summary: AisImportSummary) => {
  const importedDraft =
    (summary as AisImportSummary & { form16Draft?: DraftImport }).form16Draft ||
    buildDraftFromAis(data, summary);
  const reviewRecords = buildExtractionReviewRecords(importedDraft, summary);
  const parserAuditEntries = buildParserAuditEntries(reviewRecords);

  appendAuditEntries(parserAuditEntries);
  return { importedDraft, reviewRecords, parserAuditEntries };
};

const summarizeAisJson = (data: unknown, fileName: string): AisImportSummary => {
  const detectedSections = new Set<string>();
  const totals = {
    tds: 0,
    interest: 0,
    dividend: 0,
    salary: 0,
    other: 0,
  };

  const visit = (value: unknown, keyPath = '') => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${keyPath}.${index}`));
      return;
    }

    if (!value || typeof value !== 'object') return;

    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      const normalizedKey = `${keyPath}.${key}`.toLowerCase();
      const childText = typeof child === 'string' ? child.toLowerCase() : '';

      if (normalizedKey.includes('tds') || normalizedKey.includes('tcs')) {
        detectedSections.add('TDS/TCS');
      }
      if (normalizedKey.includes('sft')) detectedSections.add('SFT');
      if (normalizedKey.includes('refund')) detectedSections.add('Refund');
      if (normalizedKey.includes('demand')) detectedSections.add('Demand');
      if (normalizedKey.includes('salary') || childText.includes('salary')) {
        detectedSections.add('Salary');
      }
      if (normalizedKey.includes('interest') || childText.includes('interest')) {
        detectedSections.add('Interest');
      }
      if (normalizedKey.includes('dividend') || childText.includes('dividend')) {
        detectedSections.add('Dividend');
      }
      if (normalizedKey.includes('rent') || normalizedKey.includes('house property') || childText.includes('rent')) {
        detectedSections.add('House Property');
      }
      if (
        normalizedKey.includes('business') ||
        normalizedKey.includes('professional') ||
        childText.includes('business') ||
        childText.includes('professional')
      ) {
        detectedSections.add('Business/Profession');
      }
      if (
        normalizedKey.includes('capital gain') ||
        normalizedKey.includes('sale consideration') ||
        childText.includes('capital gain')
      ) {
        detectedSections.add('Capital Gains');
      }

      if (
        typeof child === 'number' ||
        (typeof child === 'string' && /^\s*[\d,]+(?:\.\d+)?\s*$/.test(child))
      ) {
        const amount = toNumber(child);
        if (amount > 0) {
          if (normalizedKey.includes('tds') || normalizedKey.includes('tcs')) totals.tds += amount;
          else if (normalizedKey.includes('interest')) totals.interest += amount;
          else if (normalizedKey.includes('dividend')) totals.dividend += amount;
          else if (normalizedKey.includes('salary')) totals.salary += amount;
          else if (normalizedKey.includes('amount') || normalizedKey.includes('value')) totals.other += amount;
        }
      }

      visit(child, normalizedKey);
    });
  };

  visit(data);

  return {
    fileName,
    importedAt: new Date().toISOString(),
    detectedSections: Array.from(detectedSections),
    totals,
    rawPreview: data,
  };
};

const hasLocalOnlyImportData = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    localStorage.getItem(STORAGE_KEYS.AIS_IMPORT) ||
      localStorage.getItem(STORAGE_KEYS.EXTRACTION_REVIEW) ||
      localStorage.getItem(STORAGE_KEYS.ITR_DRAFT)
  );
};

const persistImportToBackend = async (
  summary: AisImportSummary,
  records: ExtractionReviewRecord[]
) => {
  const headers = getAuthHeaders();
  if (!headers) {
    throw new Error('Sign in before saving imports to your account.');
  }

  const auditTrail = buildParserAuditEntries(records);
  const res = await fetch('/api/imports', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      documentType: normalizeDocumentType(summary.fileName, summary.detectedSections),
      fileName: summary.fileName,
      importedAt: summary.importedAt,
      detectedSections: summary.detectedSections,
      totals: summary.totals,
      rawPreview: null,
      extractedFields: records,
      auditTrail,
    }),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Import could not be saved to your account.');
  }

  return data.data?.import as PersistedImport | undefined;
};

const patchImportReview = async (
  importId: string,
  records: ExtractionReviewRecord[],
  auditTrail: AuditEntry[]
) => {
  const headers = getAuthHeaders();

  const res = await fetch(`/api/imports/${encodeURIComponent(importId)}/review`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ extractedFields: records, auditTrail }),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Review changes could not be saved.');
  }

  return data.data?.import as PersistedImport | undefined;
};

const deletePersistedImport = async (importId: string) => {
  const headers = getAuthHeaders();

  const res = await fetch(`/api/imports/${encodeURIComponent(importId)}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Persisted import could not be removed.');
  }
};

const fileToBase64 = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const uploadDocumentToBackend = async (file: File, text: string, fileBase64 = '') => {
  const headers = getAuthHeaders();
  if (!headers) throw new Error('Sign in before uploading documents to your account.');

  const res = await fetch('/api/imports/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || 'text/plain',
      text,
      fileBase64,
      sizeBytes: file.size,
    }),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Document could not be processed.');
  }

  return data.data?.import as PersistedImport | undefined;
};

const isBinaryImportFile = (file: File) =>
  file.type === 'application/pdf' ||
  file.type.startsWith('image/') ||
  /\.(pdf|png|jpe?g|webp|tiff?)$/i.test(file.name);

const readStoredDraft = () => ({} as Partial<DraftImport>);

const hasAnyValue = (record: Record<string, string> | undefined) =>
  Boolean(record && Object.values(record).some((value) => Number(value || 0) > 0));

const buildAisIntelligence = (summary: AisImportSummary | null, draft = readStoredDraft()): AisIntelligence | null => {
  if (!summary) return null;

  const mappedHeads = [
    hasAnyValue(draft.salary) ? 'Salary' : '',
    hasAnyValue(draft.houseProperty) ? 'House Property' : '',
    hasAnyValue(draft.pgbp) ? 'Business/Profession' : '',
    hasAnyValue(draft.capitalGains) ? 'Capital Gains' : '',
    hasAnyValue(draft.otherSources) ? 'Other Sources' : '',
  ].filter(Boolean);

  const warnings: string[] = [];
  const documents = new Set<string>(['AIS / Form 26AS']);
  const nextActions = ['Review mapped values in Start New ITR Filing'];

  if (summary.detectedSections.includes('Salary') || hasAnyValue(draft.salary)) {
    documents.add('Form 16');
    if (!draft.salary?.deductions16) {
      warnings.push('Salary found. Verify standard deduction and professional tax under deductions u/s 16.');
    }
  }

  if (summary.detectedSections.includes('Interest') || draft.otherSources?.fdInterest || draft.otherSources?.savingsInterest) {
    documents.add('Bank interest certificate');
    nextActions.push('Confirm whether interest belongs to savings or fixed deposits');
  }

  if (summary.detectedSections.includes('Dividend') || draft.otherSources?.dividendIncome) {
    documents.add('Dividend statement');
  }

  if (summary.detectedSections.includes('Capital Gains') || hasAnyValue(draft.capitalGains)) {
    documents.add('Broker capital gains statement');
    warnings.push('Capital gains found. Verify sale value, acquisition cost, and transfer expenses before filing.');
  }

  if (summary.detectedSections.includes('House Property') || hasAnyValue(draft.houseProperty)) {
    documents.add('Rent/home loan interest proof');
  }

  if (summary.detectedSections.includes('Business/Profession') || hasAnyValue(draft.pgbp)) {
    documents.add('Business/professional receipts and expense proof');
  }

  if (summary.totals.tds > 0 && mappedHeads.length === 0) {
    warnings.push('TDS/TCS appears in AIS, but no income head was mapped. Check the uploaded file format.');
  }

  if (mappedHeads.length === 0) {
    warnings.push('No income head could be confidently mapped. Review the readable export or enter values manually.');
  }

  nextActions.push('Ask Bee Assistant to compare old vs new regime');
  nextActions.push('Check deductions before proceeding');

  return {
    mappedHeads,
    warnings,
    documents: Array.from(documents),
    nextActions,
  };
};

const clearAisImportFromStorage = () => {
  // Legacy browser-only tax data is intentionally not treated as canonical.
};

const setPathValue = (record: Record<string, unknown>, path: string, value: string) => {
  const segments = path.split('.');
  let cursor = record;
  segments.slice(0, -1).forEach((segment) => {
    if (!cursor[segment] || typeof cursor[segment] !== 'object' || Array.isArray(cursor[segment])) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  });
  cursor[segments[segments.length - 1]] = value;
};

const draftFromReviewRecords = (records: ExtractionReviewRecord[]) => {
  const draft = {} as Partial<DraftImport>;
  records.forEach((record) => {
    if (record.path.startsWith('deductions.') || record.path.startsWith('taxpayerProfile.') || record.path.startsWith('taxCredits.')) return;
    setPathValue(draft as Record<string, unknown>, record.path, record.value);
  });
  return draft;
};

export default function ImportDataPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pan, setPan] = useState('');
  const [aisPassword, setAisPassword] = useState('');
  const [aisStatus, setAisStatus] = useState('');
  const [aisStatusType, setAisStatusType] = useState<'info' | 'success' | 'warning' | 'locked'>('info');
  const [aisIntelligence, setAisIntelligence] = useState<AisIntelligence | null>(null);
  const [uploadedAisFileName, setUploadedAisFileName] = useState('');
  const [portalOpened, setPortalOpened] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [reviewRecords, setReviewRecords] = useState<ExtractionReviewRecord[]>([]);
  const [persistedImportId, setPersistedImportId] = useState<string | null>(null);
  const [importSaveStatus, setImportSaveStatus] = useState('');
  const [importSaveType, setImportSaveType] = useState<'info' | 'success' | 'warning'>('info');

  useEffect(() => {
    const loadPersistedImports = async () => {
      const hasLegacyLocalData = hasLocalOnlyImportData();

      const headers = getAuthHeaders();
      if (!headers) {
        setImportSaveStatus(hasLegacyLocalData ? 'Local-only unsaved tax data was found in this browser. Sign in and re-upload or save explicitly; TaxBee will not use it as account data.' : '');
        setImportSaveType('warning');
        return;
      }

      try {
        const res = await fetch('/api/imports', { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Could not load account imports.');

        const latest = (data.data?.imports?.[0] || data.imports?.[0]) as PersistedImport | undefined;
        if (!latest) {
          setImportSaveStatus(hasLegacyLocalData ? 'Local-only unsaved tax data was found. It has not been migrated to MongoDB automatically.' : '');
          setImportSaveType('info');
          return;
        }

        const summary: AisImportSummary = {
          fileName: latest.fileName,
          importedAt: latest.importedAt,
          detectedSections: latest.detectedSections || [],
          totals: latest.totals || { tds: 0, interest: 0, dividend: 0, salary: 0, other: 0 },
          rawPreview: null,
        };
        const records = latest.extractedFields || [];

        setPersistedImportId(latest.id);
        setUploadedAisFileName(latest.fileName);
        if (latest.reviewStatus === 'failed' || latest.sourceMetadata?.processingStatus === 'failed') {
          setAisStatus(
            latest.sourceMetadata?.failureCode === 'OCR_NOT_CONFIGURED'
              ? 'OCR is not configured on the backend. Upload a text-based PDF/CSV/TXT export or ask an admin to enable OCR_PROVIDER.'
              : latest.sourceMetadata?.failureReason || 'Background extraction failed. Re-upload the document or enter values manually.'
          );
          setAisStatusType('warning');
        } else if (latest.sourceMetadata?.processingStatus === 'processing') {
          setAisStatus('OCR/document extraction is processing. Scanned PDF pages may take a little longer.');
          setAisStatusType('info');
        } else if (latest.reviewStatus === 'queued' || latest.sourceMetadata?.processingStatus === 'queued') {
          setAisStatus('OCR/document extraction is queued. Refresh after the worker completes.');
          setAisStatusType('info');
        } else if (latest.sourceMetadata?.extraction?.extractionMode === 'ocr_pdf_pages') {
          setAisStatus('Scanned PDF OCR completed. Review extracted fields before treating them as final.');
          setAisStatusType('success');
        } else {
          setAisStatus('Latest imported document loaded from your TaxBee account.');
          setAisStatusType('success');
        }
        setAisIntelligence(buildAisIntelligence(summary));
        setReviewRecords(records);
        setImportSaveStatus(
          latest.reviewStatus === 'failed' || latest.sourceMetadata?.processingStatus === 'failed'
            ? 'Import is saved with failed extraction status. No raw OCR text is exposed.'
            : latest.sourceMetadata?.processingStatus === 'processing' || latest.sourceMetadata?.processingStatus === 'queued'
            ? 'Background extraction has not completed yet.'
            : 'Import data is saved to MongoDB.'
        );
        setImportSaveType(
          latest.reviewStatus === 'failed' || latest.sourceMetadata?.processingStatus === 'failed'
            ? 'warning'
            : latest.sourceMetadata?.processingStatus === 'processing' || latest.sourceMetadata?.processingStatus === 'queued'
            ? 'info'
            : 'success'
        );
      } catch (error) {
        setImportSaveStatus(error instanceof Error ? error.message : 'Could not load account imports.');
        setImportSaveType('warning');
      }
    };

    void loadPersistedImports();
  }, []);

  const saveCurrentImportToAccount = async (
    summary: AisImportSummary,
    records: ExtractionReviewRecord[]
  ) => {
    setReviewRecords(records);
    setImportSaveStatus('Saving import to your account...');
    setImportSaveType('info');

    try {
      const persisted = await persistImportToBackend(summary, records);
      if (persisted?.id) setPersistedImportId(persisted.id);
      setImportSaveStatus('Import saved to MongoDB. Dashboard and Bee Assistant can use it without an ITR draft save.');
      setImportSaveType('success');
    } catch (error) {
      setPersistedImportId(null);
      setImportSaveStatus(error instanceof Error ? error.message : 'Import was not saved to your account.');
      setImportSaveType('warning');
    }
  };

  const handleAisUpload = async (file: File | null) => {
    setAisStatus('');
    setAisStatusType('info');
    if (!file) return;

    try {
      const signature = await fileSignature(file);
      const binaryImportFile = isBinaryImportFile(file);
      const text = binaryImportFile ? '' : await file.text();
      const trimmedText = text.trim();
      setImportSaveStatus(binaryImportFile ? 'Extracting text from PDF/image with TaxBee document pipeline...' : 'Processing document with TaxBee parser...');
      setImportSaveType('info');

      if (!binaryImportFile && trimmedText.startsWith('PK')) {
        throw new Error('Spreadsheet or ZIP selected');
      }

      if (!binaryImportFile && looksLikeEncryptedAisUtilityJson(trimmedText)) {
        if (!aisPassword) {
          throw new Error('Encrypted AIS password required');
        }

        const parsed = await tryDecryptEncryptedAisJson(trimmedText, aisPassword, pan);
        const decryptedFile = new File([JSON.stringify(parsed)], file.name, { type: 'application/json' });
        const persisted = await uploadDocumentToBackend(decryptedFile, JSON.stringify(parsed));
        if (!persisted) throw new Error('Document was processed but no import was returned.');
        const summary: AisImportSummary = {
          fileName: persisted.fileName,
          importedAt: persisted.importedAt,
          detectedSections: persisted.detectedSections || [],
          totals: persisted.totals || { tds: 0, interest: 0, dividend: 0, salary: 0, other: 0 },
          rawPreview: null,
        };
        const records = persisted.extractedFields || [];
        setPersistedImportId(persisted.id);
        setReviewRecords(records);
        setUploadedAisFileName(persisted.fileName);
        setAisStatus('Encrypted AIS JSON decrypted, processed, and saved to MongoDB for review.');
        setAisStatusType('success');
        setAisIntelligence(buildAisIntelligence(summary, draftFromReviewRecords(records)));
        setImportSaveStatus('Document understanding complete. Review extracted fields before treating them as final.');
        setImportSaveType('success');
        window.dispatchEvent(new CustomEvent('taxbee:storage-updated', { detail: { key: STORAGE_KEYS.ITR_DRAFT, path: 'extractionReview' } }));
        return;
      }

      if (!binaryImportFile && !trimmedText) {
        throw new Error(`Not readable AIS text. Signature: ${signature}`);
      }

      const persisted = await uploadDocumentToBackend(file, text, binaryImportFile ? await fileToBase64(file) : '');
      if (!persisted) throw new Error('Document was processed but no import was returned.');
      const queuedForProcessing = persisted.reviewStatus === 'queued' || persisted.sourceMetadata?.processingStatus === 'queued';
      const ocrQueued = queuedForProcessing && binaryImportFile && /^image\//i.test(file.type);
      const scannedPdfQueued = queuedForProcessing && binaryImportFile && file.type === 'application/pdf';
      const summary: AisImportSummary = {
        fileName: persisted.fileName,
        importedAt: persisted.importedAt,
        detectedSections: persisted.detectedSections || [],
        totals: persisted.totals || { tds: 0, interest: 0, dividend: 0, salary: 0, other: 0 },
        rawPreview: null,
      };
      const records = persisted.extractedFields || [];
      setPersistedImportId(persisted.id);
      setReviewRecords(records);
      window.dispatchEvent(
        new CustomEvent('taxbee:storage-updated', {
          detail: { key: STORAGE_KEYS.ITR_DRAFT, path: 'extractionReview' },
        })
      );
      setUploadedAisFileName(persisted.fileName);
      setAisStatus(
        ocrQueued
          ? 'Image uploaded and queued for OCR. Refresh this import after the worker completes.'
          : scannedPdfQueued
          ? 'PDF uploaded and queued for background extraction. If it has no selectable text, TaxBee will render pages for OCR in the worker.'
          : queuedForProcessing
          ? 'Document uploaded and queued for background extraction. Refresh this import after the worker completes.'
          : 'Document processed into structured tax fields and saved to MongoDB for review.'
      );
      setAisStatusType(queuedForProcessing ? 'info' : 'success');
      setAisIntelligence(buildAisIntelligence(summary, draftFromReviewRecords(records)));
      setImportSaveStatus(
        ocrQueued
          ? 'OCR queued. Extracted fields will stay pending until you review and confirm them.'
          : queuedForProcessing
          ? 'Background extraction queued. TaxBee will store the extracted fields when the worker finishes.'
          : 'Document understanding complete. Review extracted fields before treating them as final.'
      );
      setImportSaveType(queuedForProcessing ? 'info' : 'success');
    } catch (error) {
      setUploadedAisFileName('');
      setAisIntelligence(null);
      const message = error instanceof Error ? error.message : '';
      const isUnsupportedEncryptedAis =
        message === 'TaxBee could not decrypt this AIS Utility JSON format yet.' ||
        message.includes('recognized the encrypted AIS file') ||
        message.includes('encryption layout is not supported');

      if (isUnsupportedEncryptedAis) {
        setAisStatus('Locked AIS Utility file detected.');
        setAisStatusType('locked');
      } else if (message === 'Encrypted AIS password required') {
        setAisStatus('This is an encrypted AIS Utility JSON file. Enter the AIS password above, then upload it again.');
        setAisStatusType('warning');
      } else if (message === 'Spreadsheet or ZIP selected') {
        setAisStatus('This looks like a ZIP/XLSX file. Open it in Excel or AIS Utility, save/export as CSV, TXT, or readable JSON, then upload that file here.');
        setAisStatusType('warning');
      } else if (message === 'The AIS password did not match this encrypted JSON file.') {
        setAisStatus('The AIS password did not match this encrypted JSON file. Enter your full PAN above, then use DOB in DDMMYYYY format or the full PAN+DOB password.');
        setAisStatusType('warning');
      } else {
        setAisStatus(`Could not read "${file.name}" as tax data. Upload a readable PDF, image, AIS JSON, CSV, TSV, or TXT export. If this is scanned, the backend OCR provider may not be configured.`);
        setAisStatusType('warning');
      }
    }
  };

  const handleRemoveAisUpload = async () => {
    if (persistedImportId) {
      try {
        await deletePersistedImport(persistedImportId);
        setImportSaveStatus('Persisted import removed from MongoDB.');
        setImportSaveType('success');
      } catch (error) {
        setImportSaveStatus(error instanceof Error ? error.message : 'Persisted import could not be removed.');
        setImportSaveType('warning');
      }
    }

    clearAisImportFromStorage();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadedAisFileName('');
    setAisIntelligence(null);
    setPersistedImportId(null);
    saveExtractionReviewRecords([]);
    setReviewRecords([]);
    setAisStatus('Uploaded AIS data removed from TaxBee. Manually entered filing values were kept.');
    setAisStatusType('info');
    window.dispatchEvent(
      new CustomEvent('taxbee:storage-updated', {
        detail: { key: STORAGE_KEYS.AIS_IMPORT, action: 'removed' },
      })
    );
  };

  const savePanContext = async () => {
    if (!pan) {
      alert('Please enter PAN number');
      return null;
    }

    const normalizedPan = pan.toUpperCase().trim();

    if (!isValidPan(normalizedPan)) {
      alert('Please enter a valid PAN number, e.g. ABCDE1234F.');
      return null;
    }

    const taxpayerProfile = {
        panMasked: maskPan(normalizedPan),
        panLastFour: normalizedPan.slice(-4),
        importStatus: 'verified',
        importSource: 'PAN login',
        importedAt: new Date().toISOString(),
      };
    const headers = getAuthHeaders();
    if (headers) {
      try {
        const res = await fetch('/api/itr-draft', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ taxpayerProfile }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'PAN context could not be saved.');
        setImportSaveStatus('PAN context saved to MongoDB.');
        setImportSaveType('success');
      } catch (error) {
        setImportSaveStatus(error instanceof Error ? error.message : 'PAN context was not saved to your account.');
        setImportSaveType('warning');
      }
    } else {
      setImportSaveStatus('PAN verified for this session only. Sign in to save taxpayer profile to MongoDB.');
      setImportSaveType('warning');
    }
    window.dispatchEvent(
      new CustomEvent('taxbee:storage-updated', {
        detail: { key: STORAGE_KEYS.TAXPAYER_PROFILE, path: 'importStatus' },
      })
    );

    return normalizedPan;
  };

  const handleOpenPortal = async () => {
    const normalizedPan = await savePanContext();
    if (!normalizedPan) return;

    window.open(INCOME_TAX_PORTAL_URL, '_blank', 'noopener,noreferrer');
    setPortalOpened(true);
    setAisStatus('Official portal opened. Login there, complete CAPTCHA, open AIS, download JSON, then upload it here.');
    setAisStatusType('info');
  };

  const handleOpenAisPortal = async () => {
    const normalizedPan = await savePanContext();
    if (!normalizedPan) return;

    window.open(AIS_PORTAL_URL, '_blank', 'noopener,noreferrer');
    setPortalOpened(true);
    setAisStatus('AIS portal opened. If it asks you to login again, complete login on the official site.');
    setAisStatusType('info');
  };

  const handleCopyPan = async () => {
    const normalizedPan = await savePanContext();
    if (!normalizedPan) return;

    try {
      await navigator.clipboard.writeText(normalizedPan);
      setCopyStatus('PAN copied');
      window.setTimeout(() => setCopyStatus(''), 1800);
    } catch {
      setCopyStatus('Copy failed. Select and copy PAN manually.');
    }
  };

  const handleFinishImport = () => {
    if (!uploadedAisFileName && !persistedImportId) {
      alert('Please upload AIS data before continuing.');
      return;
    }

    router.push('/dashboard');
  };

  const updateReviewValue = (id: string, value: string) => {
    setReviewRecords((records) =>
      records.map((record) =>
        record.id === id
          ? {
              ...record,
              value,
              status: value === record.originalValue ? record.status : ('overridden' as const),
              updatedAt: new Date().toISOString(),
            }
          : record
      )
    );
  };

  const confirmReviewRecord = async (id: string) => {
    const nextRecords: ExtractionReviewRecord[] = reviewRecords.map((record) =>
      record.id === id
        ? {
            ...record,
            status: record.value === record.originalValue ? ('confirmed' as const) : ('overridden' as const),
            updatedAt: new Date().toISOString(),
          }
        : record
    );
    setReviewRecords(nextRecords);
    saveExtractionReviewRecords(nextRecords);
    const auditEntries = applyConfirmedExtractionsToTaxBeeHeads(nextRecords);
    if (persistedImportId) {
      setImportSaveStatus('Saving review status...');
      setImportSaveType('info');
      try {
        await patchImportReview(persistedImportId, nextRecords, auditEntries);
        setImportSaveStatus('Review status saved to MongoDB.');
        setImportSaveType('success');
      } catch (error) {
        setImportSaveStatus(error instanceof Error ? error.message : 'Review status was not saved.');
        setImportSaveType('warning');
      }
    } else {
      setImportSaveStatus('Review is visible on this screen only because the import is not saved to MongoDB. Upload again while signed in to persist it.');
      setImportSaveType('warning');
    }
    window.dispatchEvent(
      new CustomEvent('taxbee:storage-updated', {
        detail: { key: STORAGE_KEYS.ITR_DRAFT, path: 'extractionReview' },
      })
    );
  };

  const confirmAllReviewRecords = async () => {
    const nextRecords: ExtractionReviewRecord[] = reviewRecords.map((record) => ({
      ...record,
      status: record.value === record.originalValue ? 'confirmed' as const : 'overridden' as const,
      updatedAt: new Date().toISOString(),
    }));
    setReviewRecords(nextRecords);
    saveExtractionReviewRecords(nextRecords);
    const auditEntries = applyConfirmedExtractionsToTaxBeeHeads(nextRecords);
    if (persistedImportId) {
      setImportSaveStatus('Saving review status...');
      setImportSaveType('info');
      try {
        await patchImportReview(persistedImportId, nextRecords, auditEntries);
        setImportSaveStatus('All review statuses saved to MongoDB.');
        setImportSaveType('success');
      } catch (error) {
        setImportSaveStatus(error instanceof Error ? error.message : 'Review status was not saved.');
        setImportSaveType('warning');
      }
    } else {
      setImportSaveStatus('Review is visible on this screen only because the import is not saved to MongoDB. Upload again while signed in to persist it.');
      setImportSaveType('warning');
    }
    window.dispatchEvent(
      new CustomEvent('taxbee:storage-updated', {
        detail: { key: STORAGE_KEYS.ITR_DRAFT, path: 'extractionReview' },
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Import Data</h1>
        <p className="mb-6 text-gray-500">
          Follow these steps to download AIS from the official portal and bring it back to TaxBee.
        </p>

        <form onSubmit={(event) => event.preventDefault()} className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                1
              </span>
              <div>
                <h2 className="font-semibold text-gray-900">Keep PAN ready</h2>
                <p className="text-sm text-gray-500">TaxBee stores PAN context only for this import flow.</p>
              </div>
            </div>
            <label className="mb-2 block font-medium text-gray-700">PAN Number</label>
            <input
              type="text"
              value={pan}
              onChange={(e) => setPan(e.target.value)}
              placeholder="ABCDE1234F"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-black outline-none focus:border-blue-500"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCopyPan}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Copy PAN
              </button>
              {copyStatus && <span className="text-sm font-medium text-blue-700">{copyStatus}</span>}
            </div>
          </div>

          <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-gray-700">
            For your safety, enter the Income Tax portal password and CAPTCHA only on the official government portal.
            TaxBee will not store or type that password.
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                2
              </span>
              <div>
                <h2 className="font-semibold text-gray-900">Open the official portal</h2>
                <p className="text-sm text-gray-500">Login there, then open Annual Information Statement.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleOpenPortal}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Open Income Tax Portal
              </button>
              <button
                type="button"
                onClick={handleOpenAisPortal}
                className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-100"
              >
                Open AIS Portal
              </button>
            </div>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-gray-700">
              <li>Login on the official portal with password and CAPTCHA.</li>
              <li>Open Annual Information Statement and click Proceed.</li>
              <li>Select AIS and the financial year.</li>
              <li>Download JSON and return to TaxBee.</li>
              <li>Return to TaxBee and upload the downloaded file.</li>
            </ol>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <label className="mb-2 block font-medium text-gray-800">AIS JSON Password</label>
            <input
              type="password"
              value={aisPassword}
              onChange={(e) => setAisPassword(e.target.value)}
              placeholder="PAN+DOB, e.g. ABCDE1234F01012000"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-black outline-none focus:border-blue-500"
            />
            <p className="mt-2 text-xs text-gray-500">
              You can enter DOB only, like 01012000, if the full PAN is entered above. This is not saved.
            </p>
          </div>

          {portalOpened && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
              <p className="mb-2 font-semibold text-gray-900">You are in the portal step now:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Complete login and CAPTCHA on the official site.</li>
                <li>Open Annual Information Statement, then click Proceed.</li>
                <li>Select the financial year.</li>
                <li>Choose download as JSON.</li>
                <li>Return here and click Upload it in TaxBee.</li>
              </ol>
            </div>
          )}

          <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50 p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                3
              </span>
              <div>
                <h2 className="font-semibold text-gray-900">Upload in TaxBee</h2>
                <p className="text-sm text-gray-600">AIS/Form 26AS exports and readable Form 16 text are imported into review.</p>
              </div>
            </div>
            <label className="mb-2 block font-medium text-gray-800">Tax Document Export</label>
            <p className="mb-3 text-sm text-gray-600">
              Upload readable AIS JSON, Form 26AS CSV/TXT, Form 16 PDF/text, salary slips, receipts, or image documents. Scanned files need backend OCR support.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.tsv,.txt,.pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,application/json,text/csv,text/plain,application/pdf,image/png,image/jpeg,image/webp,image/tiff"
              onChange={(e) => void handleAisUpload(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }}
              className={`w-full rounded-lg px-5 py-3 font-semibold text-white ${
                uploadedAisFileName ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {uploadedAisFileName ? 'Replace AIS export' : 'Upload it in TaxBee'}
            </button>
            {uploadedAisFileName && (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    Uploaded: <span className="font-semibold">{uploadedAisFileName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveAisUpload}
                    className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Remove uploaded data
                  </button>
                </div>
              </div>
            )}
            {importSaveStatus && (
              <p
                className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                  importSaveType === 'success'
                    ? 'bg-green-50 text-green-700'
                    : importSaveType === 'warning'
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-blue-50 text-blue-700'
                }`}
              >
                {importSaveStatus}
              </p>
            )}
            {aisIntelligence && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-gray-800">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-950">Bee AI import review</p>
                    <p className="text-xs text-gray-500">Detected heads, checks, and next steps from the uploaded AIS data.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/file-your-itr')}
                    className="rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                  >
                    Review heads
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-2 font-semibold text-gray-900">Mapped heads</p>
                    {aisIntelligence.mappedHeads.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {aisIntelligence.mappedHeads.map((head) => (
                          <span key={head} className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                            {head}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No heads mapped confidently yet.</p>
                    )}
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-2 font-semibold text-gray-900">Documents to keep ready</p>
                    <ul className="space-y-1 text-xs text-gray-600">
                      {aisIntelligence.documents.map((document) => (
                        <li key={document}>- {document}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {aisIntelligence.warnings.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="mb-2 font-semibold text-amber-950">Review before filing</p>
                    <ul className="space-y-1 text-xs text-amber-900">
                      {aisIntelligence.warnings.map((warning) => (
                        <li key={warning}>- {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3 rounded-lg bg-blue-50 p-3">
                  <p className="mb-2 font-semibold text-blue-950">Next actions</p>
                  <ul className="space-y-1 text-xs text-blue-900">
                    {aisIntelligence.nextActions.map((action) => (
                      <li key={action}>- {action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {reviewRecords.length > 0 && (
              <div className="mt-3 rounded-xl border border-blue-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-950">Extraction review</p>
                    <p className="text-xs text-gray-500">
                      Confirm or correct extracted values before treating them as final filing data.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={confirmAllReviewRecords}
                    className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Confirm all
                  </button>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-bold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Extracted field</th>
                        <th className="px-3 py-2">Mapped section</th>
                        <th className="px-3 py-2">Value</th>
                        <th className="px-3 py-2">Confidence</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewRecords.map((record) => (
                        <tr key={record.id} className="border-t border-gray-200">
                          <td className="px-3 py-2">
                            <p className="font-semibold text-gray-900">{record.label}</p>
                            <p className="mt-1 text-[11px] text-gray-500">{record.source}</p>
                          </td>
                          <td className="px-3 py-2 text-gray-700">{record.mappedSection}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={record.value}
                              onChange={(e) => updateReviewValue(record.id, e.target.value)}
                              className="w-32 rounded-md border border-gray-200 px-2 py-1.5 text-right font-semibold text-gray-900 outline-none focus:border-blue-400"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-blue-50 px-2 py-1 font-bold text-blue-700">
                              {record.confidence}%
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-1 font-bold ${
                                record.status === 'confirmed'
                                  ? 'bg-green-50 text-green-700'
                                  : record.status === 'overridden'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-slate-100 text-gray-700'
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => confirmReviewRecord(record.id)}
                              className="rounded-md bg-gray-900 px-3 py-1.5 font-semibold text-white hover:bg-gray-800"
                            >
                              Confirm
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {aisStatus && aisStatusType === 'locked' && (
              <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold text-amber-950">Locked AIS Utility file detected</p>
                <p className="mt-1">
                  TaxBee recognized this as an encrypted AIS source file. The password was tried, but this file
                  did not open into readable AIS data.
                </p>
                <ol className="mt-3 list-decimal space-y-1 pl-5">
                  <li>Open the file in the official AIS Utility.</li>
                  <li>Enter the AIS password there.</li>
                  <li>After the data opens, export/save readable JSON, CSV, TSV, or TXT.</li>
                  <li>Upload that exported file here.</li>
                </ol>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAisPortal}
                    className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Open AIS Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                        fileInputRef.current.click();
                      }
                    }}
                    className="rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Upload exported file
                  </button>
                </div>
              </div>
            )}
            {aisStatus && aisStatusType !== 'locked' && (
              <p
                className={`mt-2 rounded-lg px-3 py-2 text-sm ${
                  aisStatusType === 'success'
                    ? 'bg-green-50 text-green-700'
                    : aisStatusType === 'warning'
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-blue-50 text-blue-700'
                }`}
              >
                {aisStatus}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="rounded-lg bg-gray-200 px-5 py-3 font-semibold text-gray-700"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleFinishImport}
              className={`rounded-lg px-5 py-3 font-semibold text-white ${
                uploadedAisFileName
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'cursor-not-allowed bg-gray-400'
              }`}
            >
              Finish Import
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
