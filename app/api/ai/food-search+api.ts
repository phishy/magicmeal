import { createHash } from 'crypto';

import { generateObject } from 'ai';
import { ExpoRequest } from 'expo-router/server';
import { z } from 'zod';

import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';
import { getLanguageModel } from '@/services/ai';
import { AiFoodSearchSchema } from '@/services/foodSearch/aiSchemas';
import type { AiFoodSearchCacheRecord, AiFoodSearchObject } from '@/types';
import { buildAiErrorResponse } from './error-utils';

const RequestSchema = z.object({
  query: z.string().min(1),
  page: z.number().int().positive().optional(),
  providerId: z.enum(['openai', 'ollama']).optional(),
  modelId: z.string().optional(),
});

const CACHE_TABLE = 'ai_food_search_cache';
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const DEFAULT_PAGE = 1;

function normalizeQuery(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildCacheKey(params: { query: string; page: number; providerId?: string; modelId?: string }) {
  return createHash('sha256').update(JSON.stringify(params)).digest('hex');
}

function getCacheExpiryIso(): string {
  return new Date(Date.now() + CACHE_TTL_MS).toISOString();
}

export async function POST(request: ExpoRequest) {
  try {
    const { query, page, providerId, modelId } = RequestSchema.parse(await request.json());
    const trimmedQuery = query.trim();
    if (!trimmedQuery.length) {
      return Response.json({ items: [], reasoning: null, references: [] });
    }

    const supabase = getSupabaseServiceRoleClient();
    const cacheTable = () => supabase.from(CACHE_TABLE) as any;
    const pageNumber = page ?? DEFAULT_PAGE;
    const normalizedQuery = normalizeQuery(trimmedQuery);
    const cacheKey = buildCacheKey({
      query: normalizedQuery,
      page: pageNumber,
      providerId,
      modelId,
    });

    try {
      const { data, error: cacheError } = await cacheTable()
        .select('id, response, hit_count')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      const cached = data as Pick<AiFoodSearchCacheRecord, 'id' | 'response' | 'hit_count'> | null;

      if (cacheError) {
        console.error('Food search cache lookup failed:', cacheError);
      } else if (cached?.response) {
        void cacheTable()
          .update({
            hit_count: (cached.hit_count ?? 0) + 1,
            last_hit_at: new Date().toISOString(),
            expires_at: getCacheExpiryIso(),
          })
          .eq('id', cached.id);

        return Response.json(cached.response);
      }
    } catch (cacheLookupError) {
      console.error('Food search cache lookup threw:', cacheLookupError);
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

    const responsePayload: AiFoodSearchObject =
      object ?? {
        items: [],
      };

    const { error: cacheSaveError } = await cacheTable()
      .upsert(
        {
          cache_key: cacheKey,
          query_text: normalizedQuery,
          page: pageNumber,
          provider_id: providerId ?? null,
          model_id: modelId ?? null,
          response: responsePayload,
          expires_at: getCacheExpiryIso(),
          last_hit_at: new Date().toISOString(),
          hit_count: 1,
        },
        { onConflict: 'cache_key', ignoreDuplicates: false }
      );

    if (cacheSaveError) {
      console.error('Food search cache write failed:', cacheSaveError);
    }

    return Response.json(responsePayload);
  } catch (error) {
    console.error('AI food search error:', error);
    const formatted = buildAiErrorResponse(error, 'AI search failed.');
    return Response.json({ error: formatted.message }, { status: formatted.status });
  }
}

export default function FoodSearchRoute() {
  return null;
}

