type OllamaTag = {
  name: string;
  details?: {
    parameter_size?: string;
  };
};

type OllamaTagsResponse = {
  models: OllamaTag[];
};

export async function fetchOllamaModels(options?: { signal?: AbortSignal }) {
  try {
    const response = await fetch('/api/ai/ollama-tags', {
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to load models (${response.status})`);
    }

    const data = (await response.json()) as OllamaTagsResponse;
    return (data.models ?? []).map((model) => ({
      id: model.name,
      label: formatModelLabel(model),
    }));
  } catch (error) {
    console.warn('Unable to fetch Ollama models:', error);
    return [];
  }
}

function formatModelLabel(model: OllamaTag) {
  if (model.details?.parameter_size) {
    return `${model.name} (${model.details.parameter_size})`;
  }
  return model.name;
}

