import { z } from 'zod';

import type { AiFoodItem, AiFoodReference, AiFoodSearchObject } from '@/types';

export const MAX_AI_RESULTS = 6;

export const AiFoodItemSchema: z.ZodType<AiFoodItem> = z.object({
  name: z.string(),
  brand: z.string().optional(),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  serving: z.string().optional(),
  verified: z.boolean().optional(),
});

const AiFoodReferenceSchema: z.ZodType<AiFoodReference> = z.object({
  text: z.string(),
  url: z.string().optional(),
});

export const AiFoodSearchSchema: z.ZodType<AiFoodSearchObject> = z.object({
  items: z.array(AiFoodItemSchema).max(MAX_AI_RESULTS).default([]),
  reasoning: z.string().optional(),
  references: z.array(AiFoodReferenceSchema).optional(),
});

export type { AiFoodSearchObject };

