import { ExpoRequest } from 'expo-router/server';

const ENV_OLLAMA_BASE_URL = process.env.EXPO_PUBLIC_OLLAMA_BASE_URL;

export async function GET(_request: ExpoRequest) {
  try {
    const response = await fetch(`${getOllamaBaseUrl()}/tags`);
    if (!response.ok) {
      return Response.json(
        { error: `Failed to load Ollama models (${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Ollama tags proxy error:', error);
    const message =
      error instanceof Error ? error.message : 'Unable to reach Ollama. Is it running locally?';
    return Response.json({ error: message }, { status: 500 });
  }
}

export default function OllamaTagsRoute() {
  return null;
}

function getOllamaBaseUrl() {
  if (ENV_OLLAMA_BASE_URL?.startsWith('http')) {
    return ENV_OLLAMA_BASE_URL.replace(/\/$/, '');
  }
  return 'http://127.0.0.1:11434/api';
}

