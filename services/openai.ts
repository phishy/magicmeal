import { createOpenAI } from '@ai-sdk/openai';

import type { TranscriptionFilePayload } from '@/types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const DEFAULT_TRANSCRIPTION_MODEL = 'whisper-1';
const DEFAULT_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';

const openAiClient = OPENAI_API_KEY ? createOpenAI({ apiKey: OPENAI_API_KEY }) : null;

export function getOpenAiApiKey(): string | null {
  return OPENAI_API_KEY ?? null;
}

export function hasOpenAiClient(): boolean {
  return Boolean(openAiClient);
}

export function getOpenAiClient() {
  return openAiClient;
}

export async function transcribeAudioFile(
  file: TranscriptionFilePayload,
  options?: { model?: string; apiUrl?: string }
): Promise<string> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error('Set EXPO_PUBLIC_OPENAI_API_KEY to use voice search.');
  }

  const formData = new FormData();
  formData.append('file', file as any);
  formData.append('model', options?.model ?? DEFAULT_TRANSCRIPTION_MODEL);

  const response = await fetch(options?.apiUrl ?? DEFAULT_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message ?? 'Transcription failed');
  }

  const data = await response.json();
  const text = typeof data?.text === 'string' ? data.text.trim() : '';
  return text;
}


