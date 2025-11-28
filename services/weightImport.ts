import type { DocumentPickerAsset } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { resolveApiUrl } from '@/lib/apiClient';
import { getAiRuntimeSelection, isAiModelReady } from '@/services/ai';
import type { WeightInput } from '@/types';
import { WeightParserResponseSchema } from '@/services/weightImport/aiParserShared';
import { detectWeightImportHandler, hasNativeWeightImporters } from '@/services/weightImport/formats';

export function canUseAiWeightImport(): boolean {
  return isAiModelReady();
}

export function canUseWeightImport(): boolean {
  return hasNativeWeightImporters() || canUseAiWeightImport();
}

export async function parseWeightFile(fileContent: string): Promise<WeightInput[]> {
  const normalized = fileContent ?? '';
  const handler = detectWeightImportHandler(normalized);
  if (handler) {
    return handler.parse(normalized);
  }

  if (!canUseAiWeightImport()) {
    throw new Error(
      'No built-in importer matched this file and the AI importer is disabled. Set EXPO_PUBLIC_OPENAI_API_KEY to enable AI parsing.'
    );
  }

  return parseWeightFileWithAI(normalized);
}

export async function parseWeightFileWithAI(fileContent: string): Promise<WeightInput[]> {
  const { providerId, modelId } = getAiRuntimeSelection();

  const response = await fetch(resolveApiUrl('/api/ai/weight-parser'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileContent,
      providerId,
      modelId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error ?? 'AI parser request failed.');
  }

  const object = WeightParserResponseSchema.parse(await response.json());

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


