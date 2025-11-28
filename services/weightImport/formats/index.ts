import type { WeightImportHandler } from '@/types';

import { fitbitWeightCsvImporter } from './fitbitWeightCsv';

const registeredImporters: WeightImportHandler[] = [fitbitWeightCsvImporter];

export function getWeightImportHandlers(): WeightImportHandler[] {
  return registeredImporters;
}

export function hasNativeWeightImporters(): boolean {
  return registeredImporters.length > 0;
}

export function detectWeightImportHandler(fileContent: string): WeightImportHandler | null {
  let bestMatch: { handler: WeightImportHandler; score: number } | null = null;

  for (const handler of registeredImporters) {
    try {
      const score = handler.detect(fileContent);
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { handler, score };
      }
    } catch (error) {
      console.warn(`Weight importer "${handler.id}" detect() failed`, error);
    }
  }

  return bestMatch?.handler ?? null;
}


