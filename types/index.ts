export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealEntry {
  id: string;
  profileId: string;
  name: string;
  serving?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  consumedAt: string;
  rawFood?: Record<string, unknown>;
  imageUri?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
}

export interface BloodPressureEntry {
  id: string;
  profileId?: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
  recordedAt: string;
}

export interface WeightEntry {
  id: string;
  profileId?: string;
  weight: number;
  unit?: 'lb' | 'kg';
  recordedAt: string;
}

export interface WeightEntryRecord {
  id: string;
  profile_id: string;
  weight: number;
  unit: 'lb' | 'kg';
  recorded_at: string;
  created_at: string;
}

