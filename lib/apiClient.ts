import Constants from 'expo-constants';
import { Platform } from 'react-native';

const EXPLICIT_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = getApiBaseUrl();
  if (!base || base === '') {
    return path.startsWith('/') ? path : `/${path}`;
  }

  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function getApiBaseUrl(): string {
  if (EXPLICIT_BASE_URL) {
    return EXPLICIT_BASE_URL;
  }

  if (Platform.OS === 'web') {
    return '';
  }

  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    (Constants as any)?.expoGoConfig?.hostUri ??
    Constants.manifest?.debuggerHost ??
    (Constants.manifest2 as any)?.extra?.expoGo?.hostUri;

  if (debuggerHost) {
    const [host, port] = debuggerHost.split(':');
    if (host && port) {
      return `http://${host}:${port}`;
    }
  }

  return 'http://localhost:8081';
}

