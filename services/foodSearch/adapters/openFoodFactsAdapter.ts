import type { FoodSearchAdapter, FoodSearchParams, FoodSearchResult } from '@/types';
import { searchFoodProducts } from '@/services/openFoodFacts';

async function searchWithOpenFoodFacts(params: FoodSearchParams): Promise<FoodSearchResult> {
  const { items, hasMore, products } = await searchFoodProducts(params);
  return {
    items,
    hasMore,
    metadata: {
      source: 'open-food-facts',
      products,
    },
  };
}

export const openFoodFactsAdapter: FoodSearchAdapter = {
  id: 'open-food-facts',
  label: 'Open Food Facts',
  search: searchWithOpenFoodFacts,
};

