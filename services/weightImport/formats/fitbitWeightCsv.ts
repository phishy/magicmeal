import type { WeightImportHandler, WeightInput } from '@/types';

import { normalizeWeightImportDate } from '../utils';

const REQUIRED_HEADERS = ['date', 'weight'];
const FITBIT_HINTS = ['fitbit body fat %', 'fitbit steps', 'fitbit body fat'];

export const fitbitWeightCsvImporter: WeightImportHandler = {
  id: 'fitbit-weight-csv',
  label: 'Fitbit weight export',
  detect(fileContent) {
    return detectFitbitWeightCsv(fileContent);
  },
  parse(fileContent) {
    return parseFitbitWeightCsv(fileContent);
  },
};

function detectFitbitWeightCsv(fileContent: string): number {
  if (!fileContent?.trim().length) {
    return 0;
  }

  const headerLine = getFirstNonEmptyLine(fileContent);
  if (!headerLine) {
    return 0;
  }

  const delimiter = detectDelimiter(headerLine);
  const headerCells = splitCsvLine(headerLine, delimiter).map(sanitizeHeaderValue);
  const hasRequired = REQUIRED_HEADERS.every((keyword) =>
    headerCells.some((cell) => cell === keyword || cell.startsWith(`${keyword} `))
  );
  if (!hasRequired) {
    return 0;
  }

  const hasFitbitHint = headerCells.some((cell) =>
    FITBIT_HINTS.some((hint) => cell.includes(hint))
  );

  return hasFitbitHint ? 1 : 0;
}

function parseFitbitWeightCsv(fileContent: string): WeightInput[] {
  const rows = extractCsvRows(fileContent);
  if (!rows.length) {
    return [];
  }

  const headerRow = rows[0].map(sanitizeHeaderValue);
  const dateIndex = findColumnIndex(headerRow, ['date']);
  const weightIndex = findColumnIndex(headerRow, ['weight', 'weight (lbs)', 'weight (kg)']);

  if (dateIndex === -1 || weightIndex === -1) {
    return [];
  }

  const detectedUnit = inferUnitFromHeader(headerRow[weightIndex]);

  const entries: WeightInput[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row.length) continue;

    const dateValue = row[dateIndex];
    const weightValue = row[weightIndex];
    if (!dateValue || !weightValue) continue;

    const recordedAt = normalizeWeightImportDate(dateValue);
    if (!recordedAt) continue;

    const parsedWeight = Number(String(weightValue).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      continue;
    }

    const unit = inferUnitFromValue(weightValue, detectedUnit);
    entries.push({
      weight: Number(parsedWeight.toFixed(1)),
      unit,
      recordedAt,
    });
  }

  return entries;
}

function getFirstNonEmptyLine(text: string): string | null {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    const sanitized = line.replace(/^\uFEFF/, '').trim();
    if (sanitized.length) {
      return line;
    }
  }
  return null;
}

function extractCsvRows(text: string): string[][] {
  const normalizedLines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^\uFEFF/, ''));

  const firstContentLine = normalizedLines.find((line) => line.trim().length) ?? '';
  const delimiter = detectDelimiter(firstContentLine);

  return normalizedLines
    .map((line) => splitCsvLine(line, delimiter))
    .filter((cells) => cells.some((cell) => cell.trim().length));
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
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
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/"/g, '').trim().toLowerCase();
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  return headers.findIndex((header) =>
    candidates.some(
      (candidate) => header === candidate || header.startsWith(`${candidate} `)
    )
  );
}

function inferUnitFromHeader(headerValue?: string): 'lb' | 'kg' | undefined {
  if (!headerValue) return undefined;
  if (headerValue.includes('kg')) return 'kg';
  if (headerValue.includes('lb')) return 'lb';
  return undefined;
}

function inferUnitFromValue(
  weightValue: string,
  fallback?: 'lb' | 'kg'
): 'lb' | 'kg' {
  if (/kg/i.test(weightValue)) return 'kg';
  if (/lb/i.test(weightValue)) return 'lb';
  return fallback ?? 'lb';
}

function detectDelimiter(sampleLine: string): string {
  const DEFAULT_DELIMITER = ',';
  if (!sampleLine) {
    return DEFAULT_DELIMITER;
  }

  const candidates: string[] = [',', '\t', ';', '|'];
  let bestMatch = DEFAULT_DELIMITER;
  let bestCount = -1;

  for (const candidate of candidates) {
    const count = countOccurrences(sampleLine, candidate);
    if (count > bestCount) {
      bestCount = count;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

function countOccurrences(value: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === needle) {
      count += 1;
    }
  }
  return count;
}


