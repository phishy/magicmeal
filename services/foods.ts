import { supabase } from '@/lib/supabase';
import { getProfileIdOrThrow } from '@/services/helpers';
import type {
  FoodItem,
  SavedFood,
  SavedFoodInput,
  SavedFoodRecord,
  SavedFoodUpdateInput,
} from '@/types';

const TABLE = 'foods';

const toNumber = (value: number | string | null | undefined): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mapRecord = (record: SavedFoodRecord): SavedFood => ({
  id: record.id,
  profileId: record.profile_id,
  brandName: record.brand_name ?? undefined,
  description: record.description,
  servingSize: record.serving_size,
  servingsPerContainer: Number(record.servings_per_container),
  calories: Number(record.calories) || 0,
  totalFat: toNumber(record.total_fat),
  saturatedFat: toNumber(record.saturated_fat),
  polyunsaturatedFat: toNumber(record.polyunsaturated_fat),
  monounsaturatedFat: toNumber(record.monounsaturated_fat),
  transFat: toNumber(record.trans_fat),
  cholesterol: toNumber(record.cholesterol),
  sodium: toNumber(record.sodium),
  potassium: toNumber(record.potassium),
  totalCarbohydrates: toNumber(record.total_carbohydrates),
  dietaryFiber: toNumber(record.dietary_fiber),
  sugars: toNumber(record.sugars),
  addedSugars: toNumber(record.added_sugars),
  sugarAlcohols: toNumber(record.sugar_alcohols),
  protein: toNumber(record.protein),
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const buildNutritionPayload = (input: SavedFoodInput | SavedFoodUpdateInput) => ({
  calories: input.calories,
  total_fat: input.totalFat ?? null,
  saturated_fat: input.saturatedFat ?? null,
  polyunsaturated_fat: input.polyunsaturatedFat ?? null,
  monounsaturated_fat: input.monounsaturatedFat ?? null,
  trans_fat: input.transFat ?? null,
  cholesterol: input.cholesterol ?? null,
  sodium: input.sodium ?? null,
  potassium: input.potassium ?? null,
  total_carbohydrates: input.totalCarbohydrates ?? null,
  dietary_fiber: input.dietaryFiber ?? null,
  sugars: input.sugars ?? null,
  added_sugars: input.addedSugars ?? null,
  sugar_alcohols: input.sugarAlcohols ?? null,
  protein: input.protein ?? null,
});

export async function listFoods(search?: string): Promise<SavedFood[]> {
  const profileId = await getProfileIdOrThrow();
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('profile_id', profileId)
    .order('description', { ascending: true });

  if (search?.trim()) {
    query = query.ilike('description', `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map(mapRecord);
}

export async function createFood(input: SavedFoodInput): Promise<SavedFood> {
  const profileId = await getProfileIdOrThrow();
  const payload = {
    profile_id: profileId,
    brand_name: input.brandName?.trim() || null,
    description: input.description.trim(),
    serving_size: input.servingSize.trim(),
    servings_per_container: input.servingsPerContainer,
    ...buildNutritionPayload(input),
  };

  const { data, error } = await supabase.from(TABLE).insert(payload).select('*').single();
  if (error) throw error;

  return mapRecord(data);
}

export async function getFoodById(id: string): Promise<SavedFood> {
  const profileId = await getProfileIdOrThrow();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('profile_id', profileId)
    .single();

  if (error) throw error;
  return mapRecord(data);
}

export async function updateFood(input: SavedFoodUpdateInput): Promise<SavedFood> {
  const profileId = await getProfileIdOrThrow();
  const payload = {
    brand_name: input.brandName?.trim() || null,
    description: input.description.trim(),
    serving_size: input.servingSize.trim(),
    servings_per_container: input.servingsPerContainer,
    updated_at: new Date().toISOString(),
    ...buildNutritionPayload(input),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq('id', input.id)
    .eq('profile_id', profileId)
    .select('*')
    .single();

  if (error) throw error;

  return mapRecord(data);
}

export function savedFoodToFoodItem(savedFood: SavedFood): FoodItem {
  return {
    id: `saved_food_${savedFood.id}`,
    name: savedFood.description,
    brand: savedFood.brandName,
    calories: savedFood.calories ?? 0,
    protein: savedFood.protein ?? 0,
    carbs: savedFood.totalCarbohydrates ?? 0,
    fat: savedFood.totalFat ?? 0,
    serving: savedFood.servingSize,
  };
}

