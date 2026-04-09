import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type ColumnType =
  | 'rating'
  | 'multiple_choice'
  | 'open_text'
  | 'phone'
  | 'email'
  | 'name'
  | 'date'
  | 'time'
  | 'id'
  | 'numeric'
  | 'boolean'
  | 'currency'
  | 'unknown';

export interface DetectedColumn {
  name: string;
  type: ColumnType;
  sampleValues: string[];
  nullCount: number;
  uniqueCount: number;
}

export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  columns: DetectedColumn[];
  totalRows: number;
}

// ===== Parsing =====

export function parseCSV(text: string): ParsedData {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  const headers = result.meta.fields || [];
  const rows = result.data;
  const columns = detectColumnTypes(headers, rows);

  return { headers, rows, columns, totalRows: rows.length };
}

export function parseExcel(buffer: ArrayBuffer): ParsedData {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

  const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
  const rows = jsonData.map(row => {
    const clean: Record<string, string> = {};
    for (const key of headers) {
      clean[key] = String(row[key] ?? '');
    }
    return clean;
  });

  const columns = detectColumnTypes(headers, rows);
  return { headers, rows, columns, totalRows: rows.length };
}

// ===== Column Type Detection =====

function detectColumnTypes(headers: string[], rows: Record<string, string>[]): DetectedColumn[] {
  return headers.map(header => {
    const values = rows.map(r => r[header] || '');
    const nonEmpty = values.filter(v => v.trim() !== '' && !isNullValue(v));
    const uniqueValues = new Set(nonEmpty);

    return {
      name: header,
      type: inferType(header, nonEmpty),
      sampleValues: nonEmpty.slice(0, 5),
      nullCount: values.length - nonEmpty.length,
      uniqueCount: uniqueValues.size,
    };
  });
}

function inferType(header: string, values: string[]): ColumnType {
  const headerLower = header.toLowerCase();
  const sample = values.slice(0, 50);

  // Name-based heuristics
  if (/email|e-mail|e_mail/i.test(headerLower)) return 'email';
  if (/phone|mobile|cell|contact.*no|tel/i.test(headerLower)) return 'phone';
  if (/name|first.*name|last.*name|full.*name/i.test(headerLower)) return 'name';
  if (/date|dob|birth|created|updated|timestamp/i.test(headerLower)) return 'date';
  if (/time|hour|minute/i.test(headerLower)) return 'time';
  if (/id|roll.*no|reg.*no|enrollment/i.test(headerLower)) return 'id';
  if (/rating|score|satisfaction|nps/i.test(headerLower)) return 'rating';
  if (/price|cost|amount|salary|income|revenue|₹|\$|fee/i.test(headerLower)) return 'currency';

  // Value-based heuristics
  if (sample.length === 0) return 'unknown';

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (sample.filter(v => emailPattern.test(v)).length > sample.length * 0.7) return 'email';

  const phonePattern = /^[\+]?[\d\s\-\(\)]{7,15}$/;
  if (sample.filter(v => phonePattern.test(v.replace(/\s/g, ''))).length > sample.length * 0.7) return 'phone';

  // Check if boolean
  const boolValues = new Set(sample.map(v => v.toLowerCase()));
  if (boolValues.size <= 3 && [...boolValues].every(v => ['yes', 'no', 'true', 'false', '1', '0', 'y', 'n'].includes(v))) {
    return 'boolean';
  }

  // Check if numeric / rating
  const numericCount = sample.filter(v => !isNaN(parseFloat(v.replace(/[₹$,\s]/g, '')))).length;
  if (numericCount > sample.length * 0.6) {
    const nums = sample.map(v => parseFloat(v.replace(/[₹$,\s]/g, '')));
    const max = Math.max(...nums);
    const min = Math.min(...nums);
    if (min >= 0 && max <= 10 && Number.isInteger(min) && Number.isInteger(max)) return 'rating';
    if (sample.some(v => /[₹$]/.test(v))) return 'currency';
    return 'numeric';
  }

  // Check if multiple choice (low cardinality)
  const uniqueRatio = new Set(sample.map(v => v.toLowerCase())).size / sample.length;
  if (uniqueRatio < 0.3 && sample.length > 5) return 'multiple_choice';

  return 'open_text';
}

// ===== Null Detection =====

const NULL_VALUES = new Set([
  '', 'n/a', 'na', 'null', 'none', '-', '--', '.', 'nil', 'undefined',
  'not applicable', 'not available', 'no response', 'nr', '#n/a',
]);

function isNullValue(value: string): boolean {
  return NULL_VALUES.has(value.trim().toLowerCase());
}

// ===== Local Cleaning Functions (no AI needed) =====

export function standardizeNulls(data: Record<string, string>[]): {
  cleaned: Record<string, string>[];
  changes: { row: number; column: string; original: string }[];
} {
  const changes: { row: number; column: string; original: string }[] = [];
  const cleaned = data.map((row, i) => {
    const newRow = { ...row };
    for (const [key, value] of Object.entries(newRow)) {
      if (isNullValue(value) && value !== '') {
        changes.push({ row: i, column: key, original: value });
        newRow[key] = '';
      }
    }
    return newRow;
  });
  return { cleaned, changes };
}

export function findExactDuplicates(data: Record<string, string>[]): number[][] {
  const seen = new Map<string, number[]>();
  data.forEach((row, i) => {
    const key = JSON.stringify(row);
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(i);
  });
  return [...seen.values()].filter(group => group.length > 1);
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone; // Cannot normalize
}

export function fixEmailTypo(email: string): string {
  const lower = email.toLowerCase().trim().replace(/\s/g, '');
  const domainFixes: Record<string, string> = {
    'gmal.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gnail.com': 'gmail.com',
    'hotnail.com': 'hotmail.com',
    'hotmal.com': 'hotmail.com',
    'yaho.com': 'yahoo.com',
    'yahooo.com': 'yahoo.com',
    'rediffmai.com': 'rediffmail.com',
    'outllook.com': 'outlook.com',
    'outlok.com': 'outlook.com',
  };

  for (const [typo, fix] of Object.entries(domainFixes)) {
    if (lower.endsWith(`@${typo}`)) {
      return lower.replace(`@${typo}`, `@${fix}`);
    }
  }
  return lower;
}

export function formatName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function cleanNumber(value: string): string {
  // Remove currency symbols, commas, spaces
  let cleaned = value.replace(/[₹$€£¥,\s]/g, '');
  // Handle Indian number system: 1,20,000
  cleaned = cleaned.replace(/,/g, '');
  // Handle accounting negatives: (1200) -> -1200
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  return cleaned;
}

// ===== Data Quality Score =====

export function calculateDataQuality(
  totalRows: number,
  columns: DetectedColumn[],
  issuesFound: number,
  issuesFixed: number
): number {
  if (totalRows === 0) return 0;

  const totalCells = totalRows * columns.length;
  const nullRatio = columns.reduce((sum, c) => sum + c.nullCount, 0) / totalCells;
  const issueRatio = issuesFound / totalCells;
  const fixRatio = issuesFound > 0 ? issuesFixed / issuesFound : 1;

  // Score components
  const completeness = Math.max(0, (1 - nullRatio) * 40);     // 0-40
  const accuracy = Math.max(0, (1 - issueRatio) * 30);         // 0-30
  const fixScore = fixRatio * 30;                                // 0-30

  return Math.round(completeness + accuracy + fixScore);
}
