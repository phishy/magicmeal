import { z } from 'zod';

export const WeightParserResponseSchema = z.object({
  parser: z.string(),
  summary: z.string().optional(),
});

export type WeightParserResponse = z.infer<typeof WeightParserResponseSchema>;

export function buildWeightParserPrompt(sample: string): string {
  return `
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
`.trim();
}

