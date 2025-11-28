import { z } from 'zod';

import { resolveApiUrl } from '@/lib/apiClient';
import { getAiRuntimeSelection, isAiModelReady } from '@/services/ai';
import { AiFoodItemSchema, AiFoodSearchSchema, MAX_AI_RESULTS } from '@/services/foodSearch/aiSchemas';
import type { FoodItem, FoodSearchAdapter, FoodSearchParams, FoodSearchResult } from '@/types';

export const aiFoodSearchAdapter: FoodSearchAdapter = {
  id: 'ai-fast',
  label: 'AI (Fast)',
  isAvailable: () => isAiModelReady(),
  async search(params: FoodSearchParams): Promise<FoodSearchResult> {
    const trimmedQuery = params.query.trim();
    if (!trimmedQuery) {
      return { items: [], hasMore: false };
    }

    const { providerId, modelId } = getAiRuntimeSelection();
    const response = await fetch(resolveApiUrl('/api/ai/food-search'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: params.signal,
      body: JSON.stringify({
        query: trimmedQuery,
        page: params.page,
        providerId,
        modelId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error ?? 'AI search is unavailable. Try again later.');
    }

    const payload = await response.json();
    const object = AiFoodSearchSchema.parse(payload);
    const aiItems = (object?.items ?? []).slice(0, MAX_AI_RESULTS);
    const items = aiItems.map((item, index) => normalizeAiFoodItem(item, index));

    return {
      items,
      hasMore: false,
      metadata: {
        source: 'ai-fast',
        reasoning: object?.reasoning,
        references: object?.references,
      },
    };
  },
};

function normalizeAiFoodItem(data: z.infer<typeof AiFoodItemSchema>, index: number): FoodItem {
  const sanitizeNumber = (value: number) => {
    if (!Number.isFinite(value)) {
      return 0;
    }
    const rounded = Math.round(value);
    return rounded < 0 ? 0 : rounded;
  };

  const id = `ai-${Date.now()}-${index}`;
  const serving = data.serving?.trim() || '1 serving';

  return {
    id,
    name: data.name.trim(),
    brand: data.brand?.trim() || undefined,
    calories: sanitizeNumber(data.calories),
    protein: sanitizeNumber(data.protein),
    carbs: sanitizeNumber(data.carbs),
    fat: sanitizeNumber(data.fat),
    serving,
    verified: data.verified ?? true,
  };
}

