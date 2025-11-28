import { generateObject } from 'ai';
import { ExpoRequest } from 'expo-router/server';
import { z } from 'zod';

import { getLanguageModel } from '@/services/ai';
import { AiFoodSearchSchema } from '@/services/foodSearch/aiSchemas';
import { buildAiErrorResponse } from './error-utils';

const RequestSchema = z.object({
  query: z.string().min(1),
  page: z.number().int().positive().optional(),
  providerId: z.enum(['openai', 'ollama']).optional(),
  modelId: z.string().optional(),
});

export async function POST(request: ExpoRequest) {
  try {
    const { query, page, providerId, modelId } = RequestSchema.parse(await request.json());
    const trimmedQuery = query.trim();
    if (!trimmedQuery.length) {
      return ExpoResponse.json({ items: [], reasoning: null, references: [] });
    }

    const model = getLanguageModel({ providerId, modelId });
    const { object } = await generateObject({
      model,
      schema: AiFoodSearchSchema,
      temperature: 0.2,
      system:
        'You are a registered dietitian creating precise nutrition suggestions. ' +
        'Always respond with at most six realistic grocery or restaurant items that match the user request. ' +
        'Measurements should align with US nutrition labels and include calories, protein, carbs, fat, and serving size. ' +
        'Return concise serving descriptions like "1 bar (50g)".',
      prompt: [
        `User search query: "${trimmedQuery}"`,
        page && page > 1
          ? 'Return alternative options compared to the previous page.'
          : 'Provide your top matches.',
        'If the user mentions a brand or restaurant, use it when known.',
        'Favor items that are easy to log in a food diary.',
      ].join('\n'),
    });

      return Response.json(object ?? { items: [] });
  } catch (error) {
    console.error('AI food search error:', error);
    const formatted = buildAiErrorResponse(error, 'AI search failed.');
      return Response.json({ error: formatted.message }, { status: formatted.status });
  }
}

export default function FoodSearchRoute() {
  return null;
}

