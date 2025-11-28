import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { defaultDeveloperSettings, ensureModelForProvider } from '@/constants/ai';
import { setDeveloperSettingsSnapshot } from '@/lib/developerSettingsStore';
import type { AiProviderId, DeveloperSettings } from '@/types';

const STORAGE_KEY = 'magicmeal.developer-settings';

type DeveloperSettingsContextValue = {
  settings: DeveloperSettings;
  isReady: boolean;
  setSettings: (next: DeveloperSettings) => void;
  updateSettings: (next: Partial<DeveloperSettings>) => void;
};

const DeveloperSettingsContext = createContext<DeveloperSettingsContextValue>({
  settings: defaultDeveloperSettings,
  isReady: false,
  setSettings: () => {},
  updateSettings: () => {},
});

export function DeveloperSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<DeveloperSettings>(defaultDeveloperSettings);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted) return;
        if (!raw) {
          setDeveloperSettingsSnapshot(defaultDeveloperSettings);
          return;
        }

        try {
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeSettings(parsed);
          setSettingsState(sanitized);
          setDeveloperSettingsSnapshot(sanitized);
        } catch {
          setDeveloperSettingsSnapshot(defaultDeveloperSettings);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback((deriveNext: (prev: DeveloperSettings) => DeveloperSettings) => {
    setSettingsState((prev) => {
      const next = sanitizeSettings(deriveNext(prev));
      setDeveloperSettingsSnapshot(next);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
        // Ignore storage errors to keep UI responsive.
      });
      return next;
    });
  }, []);

  const setSettings = useCallback(
    (next: DeveloperSettings) => {
      persist(() => next);
    },
    [persist]
  );

  const updateSettings = useCallback(
    (next: Partial<DeveloperSettings>) => {
      persist((prev) => sanitizeSettings({
        ...prev,
        ...next,
      }));
    },
    [persist]
  );

  const value = useMemo<DeveloperSettingsContextValue>(
    () => ({
      settings,
      isReady,
      setSettings,
      updateSettings,
    }),
    [isReady, setSettings, settings, updateSettings]
  );

  return <DeveloperSettingsContext.Provider value={value}>{children}</DeveloperSettingsContext.Provider>;
}

export function useDeveloperSettings() {
  return useContext(DeveloperSettingsContext);
}

function sanitizeSettings(input?: Partial<DeveloperSettings>): DeveloperSettings {
  const providerId = isAiProviderId(input?.aiProviderId)
    ? (input?.aiProviderId as AiProviderId)
    : defaultDeveloperSettings.aiProviderId;

  const customModelId = input?.aiModelId?.trim();
  const aiModelId = customModelId?.length ? customModelId : ensureModelForProvider(providerId);
  const foodSearchProviderId =
    input?.foodSearchProviderId ?? defaultDeveloperSettings.foodSearchProviderId;

  return {
    aiProviderId: providerId,
    aiModelId,
    foodSearchProviderId,
  };
}

function isAiProviderId(value: unknown): value is AiProviderId {
  return value === 'openai' || value === 'ollama';
}

