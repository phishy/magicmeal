import type { WeightInput } from '@/services/weight';
import { getOpenAiClient, hasOpenAiClient } from '@/services/openai';
import type { DocumentPickerAsset } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { generateObject } from 'ai';
import { z } from 'zod';

const OPENAI_MODEL = 'gpt-4o-mini';

const ParserResponseSchema = z.object({
  parser: z.string(),
  summary: z.string().optional(),
});

export function canUseAiWeightImport(): boolean {
  return hasOpenAiClient();
}

export async function parseWeightFileWithAI(fileContent: string): Promise<WeightInput[]> {
  const aiClient = getOpenAiClient();
  if (!aiClient) {
    throw new Error('OpenAI client not configured.');
  }

  const sample = fileContent.split(/\r?\n/).slice(0, 5).join('\n');
  const prompt = `
You are a senior data engineer. I will provide the first few lines of a file that contains historical body-weight entries.
You must infer the structure and return JSON with a plain JavaScript function that can parse the ENTIRE file.

Requirements:
- Respond ONLY with JSON following this schema:
{
  "parser": "function parseWeightLog(fileText) { ... }",
  "summary": "One sentence describing the detected format"
}
- The parser must:
  * Accept a single string argument \`fileText\`.
  * Return an array of objects shaped like { weight: number, unit: 'lb' | 'kg', recordedAt: string }.
  * Handle headers, blank lines, and common date formats. Convert dates to ISO 8601 strings (set time to 09:00:00 local if missing).
  * Assume "lb" when units are missing.
  * Use only vanilla JavaScript—no external libraries.
  * Never access the network or global variables.

Sample input (first ~5 lines only):
"""
${sample}
"""
`;

  const { object } = await generateObject({
    model: aiClient(OPENAI_MODEL),
    temperature: 0,
    schema: ParserResponseSchema,
    prompt,
  });

  if (!object?.parser) {
    throw new Error('AI response missing parser function.');
  }

  const rawEntries = runGeneratedParser(object.parser, fileContent);
  if (!Array.isArray(rawEntries)) {
    throw new Error('Generated parser must return an array of entries.');
  }

  return rawEntries
    .map((entry) => normalizeParsedEntry(entry))
    .filter((entry): entry is WeightInput => Boolean(entry));
}

export async function readWeightImportFile(asset: DocumentPickerAsset): Promise<string> {
  const canUseNativeFs =
    Platform.OS !== 'web' && typeof (FileSystem as any)?.readAsStringAsync === 'function';
  if (canUseNativeFs) {
    const encoding = (FileSystem as any).EncodingType?.UTF8 ?? 'utf8';
    return FileSystem.readAsStringAsync(asset.uri, { encoding });
  }

  const webFile = (asset as any).file;
  if (webFile?.text) {
    return webFile.text();
  }

  const response = await fetch(asset.uri);
  if (!response.ok) {
    throw new Error('Unable to load file contents.');
  }
  return response.text();
}

function runGeneratedParser(parserSource: string, fileContent: string) {
  if (parserSource.length > 8000) {
    throw new Error('AI parser response was unexpectedly long.');
  }

  try {
    const runner = new Function(
      'fileText',
      `
      "use strict";
      ${parserSource}
      if (typeof parseWeightLog !== 'function') {
        throw new Error('Parser must define function parseWeightLog(fileText).');
      }
      const result = parseWeightLog(fileText);
      return result;
    `
    );

    return runner(fileContent);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Failed to execute the generated parser.'
    );
  }
}

function normalizeParsedEntry(data: any): WeightInput | null {
  const weightValue =
    typeof data?.weight === 'number'
      ? data.weight
      : data?.weight
      ? Number(String(data.weight).replace(/[^\d.-]/g, ''))
      : data?.value
      ? Number(String(data.value).replace(/[^\d.-]/g, ''))
      : undefined;

  if (typeof weightValue !== 'number' || Number.isNaN(weightValue) || weightValue <= 0) {
    return null;
  }

  const unitRaw =
    data?.unit ?? data?.units ?? data?.weightUnit ?? data?.unitOfMeasure ?? data?.measurement;
  const unit = typeof unitRaw === 'string' && unitRaw.toLowerCase().includes('kg') ? 'kg' : 'lb';

  const recordedAtRaw =
    data?.recordedAt ??
    data?.date ??
    data?.timestamp ??
    data?.datetime ??
    data?.day ??
    data?.time ??
    data?.enteredAt;

  const recordedAt = normalizeDateValue(recordedAtRaw);
  if (!recordedAt) {
    return null;
  }

  return {
    weight: Number(weightValue.toFixed(1)),
    unit,
    recordedAt,
  };
}

function normalizeDateValue(value: unknown) {
  if (!value) return null;

  const coerceDate = (input: Date) => {
    const hasTime = typeof value === 'string' && /\d{1,2}:\d{2}/.test(value);
    if (!hasTime) {
      input.setHours(9, 0, 0, 0);
    }
    return input.toISOString();
  };

  if (value instanceof Date) {
    return coerceDate(new Date(value.getTime()));
  }

  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : coerceDate(fromNumber);
  }

  const text = String(value).trim();
  if (!text.length) return null;

  let candidate = text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    candidate = `${text}T09:00:00`;
  }

  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return coerceDate(date);
}


