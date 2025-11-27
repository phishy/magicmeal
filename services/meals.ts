import { supabase } from '@/lib/supabase';
import { getProfileIdOrThrow } from '@/services/helpers';
import type { FoodItem, MealEntry, MealType } from '@/types';

export interface MealInput {
  name: string;
  serving?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  consumedAt?: string;
  rawFood?: Record<string, unknown>;
}

const TABLE = 'meals';

const toMealEntry = (record: any): MealEntry => ({
  id: record.id,
  profileId: record.profile_id,
  name: record.name,
  serving: record.serving,
  calories: record.calories,
  protein: record.protein,
  carbs: record.carbs,
  fat: record.fat,
  mealType: record.meal_type,
  consumedAt: record.consumed_at,
  rawFood: record.raw_food ?? undefined,
});

export async function fetchMealsForDate(date: Date): Promise<MealEntry[]> {
  const profileId = await getProfileIdOrThrow();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('profile_id', profileId)
    .gte('consumed_at', start.toISOString())
    .lt('consumed_at', end.toISOString())
    .order('consumed_at', { ascending: true });

  if (error) throw error;
  return data.map(toMealEntry);
}

export async function createMeal(input: MealInput): Promise<MealEntry> {
  const profileId = await getProfileIdOrThrow();
  const payload = {
    profile_id: profileId,
    name: input.name,
    serving: input.serving,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    meal_type: input.mealType,
    consumed_at: input.consumedAt ?? new Date().toISOString(),
    raw_food: input.rawFood ?? null,
  };

  const { data, error } = await supabase.from(TABLE).insert(payload).select('*').single();
  if (error) throw error;
  return toMealEntry(data);
}

export async function removeMeal(id: string) {
  const profileId = await getProfileIdOrThrow();
  const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('profile_id', profileId);
  if (error) throw error;
}

export function mapFoodToMealInput(food: FoodItem, mealType: MealType): MealInput {
  return {
    name: food.name,
    serving: food.serving,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    mealType,
    rawFood: food as Record<string, unknown>,
  };
}


