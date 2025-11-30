import { getDeveloperSettingsSnapshot } from '@/lib/developerSettingsStore';
import { aiFoodSearchAdapter } from '@/services/foodSearch/adapters/aiFoodSearchAdapter';
import { openFoodFactsAdapter } from '@/services/foodSearch/adapters/openFoodFactsAdapter';
import type {
  FoodSearchAdapter,
  FoodSearchAdapterId,
  FoodSearchRequest,
  FoodSearchResult,
} from '@/types';

const ADAPTERS: Record<FoodSearchAdapterId, FoodSearchAdapter> = {
  [openFoodFactsAdapter.id]: openFoodFactsAdapter,
  [aiFoodSearchAdapter.id]: aiFoodSearchAdapter,
};

const DEFAULT_ADAPTER_ID: FoodSearchAdapterId = 'ai-fast';

export function listFoodSearchAdapters(): FoodSearchAdapter[] {
  return Object.values(ADAPTERS);
}

export function getDefaultFoodSearchAdapterId(): FoodSearchAdapterId {
  return DEFAULT_ADAPTER_ID;
}

export function getFoodSearchAdapter(id: FoodSearchAdapterId): FoodSearchAdapter | undefined {
  return ADAPTERS[id];
}

function adapterIsReady(adapter?: FoodSearchAdapter): adapter is FoodSearchAdapter {
  return Boolean(adapter && (!adapter.isAvailable || adapter.isAvailable()));
}

function pickAdapter(preferredId?: FoodSearchAdapterId): FoodSearchAdapter {
  const preferred = preferredId ? getFoodSearchAdapter(preferredId) : undefined;
  if (adapterIsReady(preferred)) {
    return preferred;
  }

  const fallback = getFoodSearchAdapter(DEFAULT_ADAPTER_ID);
  if (adapterIsReady(fallback)) {
    return fallback;
  }

  if (preferred) {
    throw new Error(`Food search adapter "${preferred.id}" is unavailable.`);
  }

  throw new Error('No food search adapters are currently available.');
}

export async function searchFoods(request: FoodSearchRequest): Promise<FoodSearchResult> {
  const snapshot = getDeveloperSettingsSnapshot();
  const adapter = pickAdapter(request.adapterId ?? snapshot.foodSearchProviderId ?? DEFAULT_ADAPTER_ID);
  const { adapterId, ...params } = request;
  const result = await adapter.search(params);
  return {
    ...result,
    metadata: {
      ...result.metadata,
      adapterId: adapter.id,
    },
  };
}

