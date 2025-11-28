import type { AiProviderId, AiProviderOption, DeveloperSettings } from '@/types';

export const AI_PROVIDER_OPTIONS: Record<AiProviderId, AiProviderOption> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    description: 'Hosted GPT models via the OpenAI API.',
    requiresApiKey: true,
    docsUrl: 'https://platform.openai.com/docs/overview',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
    ],
    baseUrlEnvVar: 'EXPO_PUBLIC_OPENAI_BASE_URL',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama',
    description: 'Local inference via the Ollama OpenAI-compatible endpoint.',
    baseUrlEnvVar: 'EXPO_PUBLIC_OLLAMA_BASE_URL',
    models: [
      { id: 'llama3.2', label: 'Llama 3.2' },
      { id: 'llama3.1', label: 'Llama 3.1' },
      { id: 'phi3.5', label: 'Phi 3.5' },
      { id: 'qwen2.5', label: 'Qwen 2.5' },
    ],
    supportsDynamicModels: true,
  },
};

export const defaultDeveloperSettings: DeveloperSettings = {
  aiProviderId: 'openai',
  aiModelId: 'gpt-4o-mini',
  foodSearchProviderId: 'ai-fast',
};

export function getDefaultModelId(providerId: AiProviderId): string {
  const provider = AI_PROVIDER_OPTIONS[providerId];
  if (!provider) {
    return defaultDeveloperSettings.aiModelId;
  }

  return provider.models[0]?.id ?? defaultDeveloperSettings.aiModelId;
}

export function ensureModelForProvider(providerId: AiProviderId, modelId?: string): string {
  if (modelId?.trim()) {
    const provider = AI_PROVIDER_OPTIONS[providerId];
    const isKnown = provider.models.some((option) => option.id === modelId);
    if (isKnown) {
      return modelId;
    }
  }

  return getDefaultModelId(providerId);
}

