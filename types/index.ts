import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

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
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  verified?: boolean;
}

export interface OpenFoodFactsNutriments {
  ['energy-kcal']?: number;
  ['energy-kcal_100g']?: number;
  energy_value?: number;
  proteins?: number;
  proteins_100g?: number;
  carbohydrates?: number;
  carbohydrates_100g?: number;
  fat?: number;
  fat_100g?: number;
  [key: string]: number | string | undefined;
}

export interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  nutriments?: OpenFoodFactsNutriments;
  serving_size?: string;
  quantity?: string;
  brands?: string;
  owner?: string;
  labels_tags?: string[];
  nutrition_grades?: string;
  nutriscore_score?: number;
}

export interface TranscriptionFilePayload {
  uri: string;
  name: string;
  type: string;
}

export interface BloodPressureEntry {
  id: string;
  profileId?: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
  recordedAt: string;
}

export type WeightUnit = 'lb' | 'kg';

export interface WeightEntry {
  id: string;
  profileId?: string;
  weight: number;
  unit?: WeightUnit;
  recordedAt: string;
}

export interface WeightEntryRecord {
  id: string;
  profile_id: string;
  weight: number;
  unit: WeightUnit;
  recorded_at: string;
  created_at: string;
}

export interface WeightTrendChartProps {
  entries: WeightEntry[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  height?: number;
  showYAxisLabels?: boolean;
  showXAxisLabels?: boolean;
  yAxisLabelCount?: number;
  wrapInCard?: boolean;
  topContent?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export interface CalorieProgressCardProps {
  goal: number;
  consumed: number;
  exercise?: number;
  onPress?: () => void;
}

export type WeeklyGoalType = 'lose' | 'gain' | 'maintain';

export type ActivityLevel = 'not_active' | 'lightly_active' | 'moderately_active' | 'very_active';

export interface ProfileGoals {
  startingWeight?: number;
  startingWeightRecordedAt?: string;
  startingWeightUnit?: WeightUnit;
  goalWeight?: number;
  goalWeightUnit?: WeightUnit;
  weeklyGoalRate?: number;
  weeklyGoalType?: WeeklyGoalType;
  activityLevel?: ActivityLevel;
}

export interface ProfileGoalsRecord {
  starting_weight: number | string | null;
  starting_weight_recorded_at: string | null;
  starting_weight_unit: WeightUnit | null;
  goal_weight: number | string | null;
  goal_weight_unit: WeightUnit | null;
  weekly_goal_rate: number | string | null;
  weekly_goal_type: WeeklyGoalType | null;
  activity_level: ActivityLevel | null;
}

