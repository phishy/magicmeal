import type { SentryRuntimeConfig } from '@/types';

const parseBoolean = (value: string | undefined, defaultValue = false) => {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
};

const parseNumber = (value: string | undefined, defaultValue: number) => {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

export const sentryConfig: SentryRuntimeConfig = {
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || undefined,
  environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || undefined,
  enableLogs: parseBoolean(process.env.EXPO_PUBLIC_SENTRY_ENABLE_LOGS, true),
  sendDefaultPii: parseBoolean(process.env.EXPO_PUBLIC_SENTRY_SEND_DEFAULT_PII, true),
  enableFeedback: parseBoolean(process.env.EXPO_PUBLIC_SENTRY_ENABLE_FEEDBACK, true),
  enableReplay: parseBoolean(process.env.EXPO_PUBLIC_SENTRY_ENABLE_REPLAY, true),
  replaysSessionSampleRate: parseNumber(process.env.EXPO_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE, 0.1),
  replaysOnErrorSampleRate: parseNumber(process.env.EXPO_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE, 1),
};

export const shouldInitSentry = Boolean(sentryConfig.dsn);

export const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || undefined;

