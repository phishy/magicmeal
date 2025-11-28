import { generateObject } from 'ai';
import { z } from 'zod';

import type { FoodItem, FoodSearchAdapter, FoodSearchParams, FoodSearchResult } from '@/types';
import { getOpenAiClient } from '@/services/openai';

const FAST_MODEL = 'gpt-4o-mini';
const MAX_AI_RESULTS = 6;

const AiFoodItemSchema = z.object({
  name: z.string(),
  brand: z.string().optional(),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  serving: z.string().optional(),
  verified: z.boolean().optional(),
});

const AiFoodSearchSchema = z.object({
  items: z.array(AiFoodItemSchema).max(MAX_AI_RESULTS).default([]),
  reasoning: z.string().optional(),
  references: z
    .array(
      z.object({
        text: z.string(),
        url: z.string().optional(),
      })
    )
    .optional(),
});

export const aiFoodSearchAdapter: FoodSearchAdapter = {
  id: 'ai-fast',
  label: 'AI (Fast)',
  isAvailable: () => Boolean(getOpenAiClient()),
  async search(params: FoodSearchParams): Promise<FoodSearchResult> {
    const aiClient = getOpenAiClient();
    if (!aiClient) {
      throw new Error('AI search is unavailable. Set EXPO_PUBLIC_OPENAI_API_KEY.');
    }

    const trimmedQuery = params.query.trim();
    if (!trimmedQuery) {
      return { items: [], hasMore: false };
    }

    const { object } = await generateObject({
      model: aiClient(FAST_MODEL),
      schema: AiFoodSearchSchema,
      temperature: 0.2,
      system:
        'You are a registered dietitian creating precise nutrition suggestions. ' +
        'Always respond with at most six realistic grocery or restaurant items that match the user request. ' +
        'Measurements should align with US nutrition labels and include calories, protein, carbs, fat, and serving size. ' +
        'Return concise serving descriptions like "1 bar (50g)".',
      prompt: [
        `User search query: "${trimmedQuery}"`,
        params.page && params.page > 1
          ? 'Return alternative options compared to the previous page.'
          : 'Provide your top matches.',
        'If the user mentions a brand or restaurant, use it when known.',
        'Favor items that are easy to log in a food diary.',
      ].join('\n'),
    });

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

