import type {
  FoodItem,
  FoodLogCandidate,
  FoodNutritionFacts,
  FoodSearchParams,
  FoodSourceType,
  OpenFoodFactsProduct,
} from '@/types';

const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.org';
const SEARCH_ENDPOINT = `${OPEN_FOOD_FACTS_BASE_URL}/cgi/search.pl`;
const BARCODE_ENDPOINT = `${OPEN_FOOD_FACTS_BASE_URL}/api/v0/product`;
const DEFAULT_PAGE_SIZE = 20;

interface BarcodeLookupResponse {
  status: number;
  product?: OpenFoodFactsProduct;
}

interface SearchResponse {
  products?: OpenFoodFactsProduct[];
}

export async function lookupProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const response = await fetch(`${BARCODE_ENDPOINT}/${encodeURIComponent(barcode)}.json`);
  if (!response.ok) {
    throw new Error('Failed to look up barcode.');
  }
  const data: BarcodeLookupResponse = await response.json();
  if (data.status === 1 && data.product) {
    return data.product;
  }
  return null;
}

export async function searchFoodProducts({
  query,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  signal,
}: FoodSearchParams): Promise<{ items: FoodItem[]; hasMore: boolean; products: OpenFoodFactsProduct[] }> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    json: '1',
    page: String(page),
    page_size: String(pageSize),
  });

  const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error('Failed to search foods.');
  }

  const data: SearchResponse = await response.json();
  const products = (data.products ?? []).filter(
    (product) => Boolean(product?.product_name) && Boolean(product?.nutriments)
  );

  const items = products
    .map((product) => mapProductToFoodItem(product))
    .filter((item): item is FoodItem => Boolean(item));

  return {
    items,
    hasMore: items.length === pageSize,
    products,
  };
}

function mapProductToFoodItem(product: OpenFoodFactsProduct): FoodItem | null {
  if (!product.product_name || !product.nutriments) {
    return null;
  }

  const getNumber = (value: unknown): number => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return Math.round(value);
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : Math.round(parsed);
    }
    return 0;
  };

  const nutriments = product.nutriments;

  return {
    id: product.code ?? Math.random().toString(),
    name: product.product_name,
    brand: product.brands?.split(',')?.[0]?.trim() ?? product.owner,
    calories: getNumber(
      nutriments['energy-kcal_100g'] ?? nutriments.energy_value ?? nutriments['energy-kcal']
    ),
    protein: getNumber(nutriments.proteins_100g ?? nutriments.proteins),
    carbs: getNumber(nutriments.carbohydrates_100g ?? nutriments.carbohydrates),
    fat: getNumber(nutriments.fat_100g ?? nutriments.fat),
    serving: product.serving_size ?? product.quantity ?? '100g',
    verified: Boolean(
      product.nutrition_grades ||
        product.nutriscore_score ||
        product.labels_tags?.some((tag: string) => tag.includes('verified'))
    ),
  };
}

export function mapProductToFoodLogCandidate(
  product: OpenFoodFactsProduct,
  source: FoodSourceType = 'barcode'
): FoodLogCandidate | null {
  if (!product.product_name || !product.nutriments) {
    return null;
  }

  const nutriments = product.nutriments;
  const parseNumber = (value: unknown): number => {
    if (typeof value === 'number') {
      return Number.isNaN(value) ? 0 : value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const getPerServing = (key: string) => {
    const servingValue =
      nutriments[`${key}_serving` as keyof typeof nutriments] ??
      nutriments[`${key}_prepared_serving` as keyof typeof nutriments];
    if (servingValue !== undefined) {
      return parseNumber(servingValue);
    }
    const hundredValue =
      nutriments[`${key}_100g` as keyof typeof nutriments] ??
      nutriments[key as keyof typeof nutriments];
    return parseNumber(hundredValue);
  };

  const nutrition: FoodNutritionFacts = {
    calories: getPerServing('energy-kcal') || parseNumber(nutriments.energy_value),
    protein: getPerServing('proteins'),
    carbs: getPerServing('carbohydrates'),
    fat: getPerServing('fat'),
    fiber: getPerServing('fiber') || getPerServing('dietary-fiber'),
    sugar: getPerServing('sugars'),
    sodium: getPerServing('sodium'),
    saturatedFat: getPerServing('saturated-fat'),
    polyunsaturatedFat: getPerServing('polyunsaturated-fat'),
    monounsaturatedFat: getPerServing('monounsaturated-fat'),
    transFat: getPerServing('trans-fat'),
    cholesterol: getPerServing('cholesterol'),
  };

  return {
    id: product.code ?? Math.random().toString(36),
    name: product.product_name,
    brand: product.brands?.split(',')?.[0]?.trim() ?? product.owner,
    servingSize: product.serving_size ?? product.quantity ?? '1 serving',
    defaultServings: 1,
    source,
    barcode: product.code,
    nutrition,
    rawFood: { product },
  };
}


