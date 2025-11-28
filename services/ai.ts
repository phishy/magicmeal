import { createOpenAI } from '@ai-sdk/openai';
import { createOllama } from 'ollama-ai-provider-v2';

import { getDefaultModelId } from '@/constants/ai';
import { getDeveloperSettingsSnapshot } from '@/lib/developerSettingsStore';
import type { AiProviderId, TranscriptionFilePayload } from '@/types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.EXPO_PUBLIC_OPENAI_BASE_URL;
const OLLAMA_BASE_URL = process.env.EXPO_PUBLIC_OLLAMA_BASE_URL || 'http://127.0.0.1:11434/api';
const OLLAMA_API_KEY = process.env.EXPO_PUBLIC_OLLAMA_API_KEY;

const DEFAULT_TRANSCRIPTION_MODEL = 'whisper-1';
const DEFAULT_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';

const openAiClient = OPENAI_API_KEY
  ? createOpenAI({
      apiKey: OPENAI_API_KEY,
      ...(OPENAI_BASE_URL ? { baseURL: normalizeBaseUrl(OPENAI_BASE_URL) } : {}),
    })
  : null;

const ollamaClient = createOllama({
  baseURL: normalizeOllamaBaseUrl(OLLAMA_BASE_URL),
  compatibility: 'strict',
  ...(OLLAMA_API_KEY ? { headers: { Authorization: `Bearer ${OLLAMA_API_KEY}` } } : {}),
});

type ProviderClient = ReturnType<typeof createOpenAI> | ReturnType<typeof createOllama>;

const providerClients: Record<AiProviderId, ProviderClient | null> = {
  openai: openAiClient,
  ollama: ollamaClient,
};

function normalizeBaseUrl(url?: string) {
  if (!url) return undefined;
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function normalizeOllamaBaseUrl(url?: string) {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) return undefined;
  if (normalized.endsWith('/v1')) {
    return normalized.replace(/\/v1$/, '/api');
  }
  if (!normalized.endsWith('/api')) {
    return `${normalized}/api`;
  }
  return normalized;
}

function resolveProviderId(providerId?: AiProviderId): AiProviderId {
  const snapshot = getDeveloperSettingsSnapshot();
  return providerId ?? snapshot.aiProviderId ?? 'openai';
}

function resolveModelId(providerId: AiProviderId, override?: string): string {
  const candidate = override?.trim() || getDeveloperSettingsSnapshot().aiModelId?.trim();
  if (candidate?.length) {
    return candidate;
  }
  return getDefaultModelId(providerId);
}

function getClient(providerId: AiProviderId): ProviderClient | null {
  return providerClients[providerId] ?? null;
}

export function getOpenAiApiKey(): string | null {
  return OPENAI_API_KEY ?? null;
}

export function isAiProviderReady(providerId?: AiProviderId): boolean {
  const resolved = resolveProviderId(providerId);
  const client = getClient(resolved);
  if (resolved === 'openai') {
    return Boolean(client && OPENAI_API_KEY);
  }
  return Boolean(client);
}

export function isAiModelReady(): boolean {
  return isAiProviderReady();
}

export function getLanguageModel(options?: { providerId?: AiProviderId; modelId?: string }) {
  const providerId = resolveProviderId(options?.providerId);
  const client = getClient(providerId);

  if (!client) {
    if (providerId === 'openai') {
      throw new Error('OpenAI is unavailable. Set EXPO_PUBLIC_OPENAI_API_KEY or pick another provider.');
    }
    throw new Error('Ollama is unavailable. Ensure the service is running or update Developer Settings.');
  }

  const modelId = resolveModelId(providerId, options?.modelId);
  if (!modelId) {
    throw new Error('No AI model configured. Update Developer Settings.');
  }

  return client(modelId);
}

export function getAiRuntimeSelection() {
  const snapshot = getDeveloperSettingsSnapshot();
  const providerId = snapshot.aiProviderId ?? 'openai';
  const modelId = snapshot.aiModelId?.trim() || getDefaultModelId(providerId);
  return { providerId, modelId };
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
