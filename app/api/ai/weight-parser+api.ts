import { generateObject } from 'ai';
import { ExpoRequest } from 'expo-router/server';
import { z } from 'zod';

import { getLanguageModel } from '@/services/ai';
import {
    WeightParserResponseSchema,
    buildWeightParserPrompt,
} from '@/services/weightImport/aiParserShared';
import { buildAiErrorResponse } from './error-utils';

const RequestSchema = z.object({
  fileContent: z.string().min(1),
  providerId: z.enum(['openai', 'ollama']).optional(),
  modelId: z.string().optional(),
});

export async function POST(request: ExpoRequest) {
  try {
    const { fileContent, providerId, modelId } = RequestSchema.parse(await request.json());
    const sample = fileContent.split(/\r?\n/).slice(0, 5).join('\n');
    const prompt = buildWeightParserPrompt(sample);

    const model = getLanguageModel({ providerId, modelId });
    const { object } = await generateObject({
      model,
      temperature: 0,
      schema: WeightParserResponseSchema,
      prompt,
    });

    if (!object?.parser) {
      throw new Error('AI response missing parser function.');
    }

    return Response.json(object);
  } catch (error) {
    console.error('AI weight parser error:', error);
    const formatted = buildAiErrorResponse(error, 'AI parser request failed.');
    return Response.json({ error: formatted.message }, { status: formatted.status });
  }
}

export default function WeightParserRoute() {
  return null;
}

