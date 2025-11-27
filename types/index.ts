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

