import { defaultDeveloperSettings } from '@/constants/ai';
import type { DeveloperSettings } from '@/types';

type Listener = (settings: DeveloperSettings) => void;

let currentSettings: DeveloperSettings = defaultDeveloperSettings;
const listeners = new Set<Listener>();

export function getDeveloperSettingsSnapshot(): DeveloperSettings {
  return currentSettings;
}

export function setDeveloperSettingsSnapshot(next: DeveloperSettings): void {
  currentSettings = next;
  listeners.forEach((listener) => {
    listener(currentSettings);
  });
}

export function subscribeDeveloperSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

