import type { FoodLogCandidate } from '@/types';

interface PendingEntry {
  token: string;
  payload: FoodLogCandidate;
  createdAt: number;
}

const pendingFoodLogs = new Map<string, PendingEntry>();
const ONE_HOUR_MS = 60 * 60 * 1000;

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [token, entry] of pendingFoodLogs.entries()) {
    if (now - entry.createdAt > ONE_HOUR_MS) {
      pendingFoodLogs.delete(token);
    }
  }
}

function generateToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function stashFoodLogCandidate(payload: FoodLogCandidate): string {
  cleanupExpiredEntries();
  const token = generateToken();
  pendingFoodLogs.set(token, { token, payload, createdAt: Date.now() });
  return token;
}

export function getFoodLogCandidate(token: string | undefined | null): FoodLogCandidate | null {
  if (!token) {
    return null;
  }
  cleanupExpiredEntries();
  const entry = pendingFoodLogs.get(token);
  return entry?.payload ?? null;
}

export function consumeFoodLogCandidate(token: string | undefined | null): FoodLogCandidate | null {
  if (!token) {
    return null;
  }
  const candidate = getFoodLogCandidate(token);
  if (candidate) {
    pendingFoodLogs.delete(token);
  }
  return candidate;
}


