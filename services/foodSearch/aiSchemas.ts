import { z } from 'zod';

export const MAX_AI_RESULTS = 6;

export const AiFoodItemSchema = z.object({
  name: z.string(),
  brand: z.string().optional(),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  serving: z.string().optional(),
  verified: z.boolean().optional(),
});

export const AiFoodSearchSchema = z.object({
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

export type AiFoodSearchObject = z.infer<typeof AiFoodSearchSchema>;

