import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type AuthMode = 'signin' | 'signup';

export type AuthFeedbackTone = 'info' | 'error';

export interface AuthFeedback {
  tone: AuthFeedbackTone;
  message: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

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

export interface AiFoodItem {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving?: string;
  verified?: boolean;
}

export interface AiFoodReference {
  text: string;
  url?: string;
}

export interface AiFoodSearchObject {
  items: AiFoodItem[];
  reasoning?: string;
  references?: AiFoodReference[];
}

export interface FoodNutritionFacts {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  polyunsaturatedFat?: number;
  monounsaturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
}

export type FoodSourceType = 'barcode' | 'search' | 'photo' | 'manual';

export interface FoodLogCandidate {
  id: string;
  name: string;
  brand?: string;
  servingSize?: string;
  defaultServings?: number;
  source: FoodSourceType;
  barcode?: string;
  nutrition: FoodNutritionFacts;
  rawFood?: Record<string, unknown>;
}

export interface FoodSearchParams {
  query: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface FoodSearchResult {
  items: FoodItem[];
  hasMore: boolean;
  metadata?: Record<string, unknown>;
}

export type FoodSearchAdapterId = 'open-food-facts' | 'ai-fast';

export interface FoodSearchRequest extends FoodSearchParams {
  adapterId?: FoodSearchAdapterId;
}

export interface FoodSearchAdapter {
  id: FoodSearchAdapterId;
  label: string;
  isAvailable?: () => boolean;
  search: (params: FoodSearchParams) => Promise<FoodSearchResult>;
}

export interface AiFoodSearchCacheRecord {
  id: string;
  cache_key: string;
  query_text: string;
  page: number;
  provider_id?: string | null;
  model_id?: string | null;
  response: AiFoodSearchObject;
  hit_count: number;
  last_hit_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
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

export type AiProviderId = 'openai' | 'ollama';

export interface AiModelOption {
  id: string;
  label: string;
  description?: string;
}

export interface AiProviderOption {
  id: AiProviderId;
  label: string;
  description?: string;
  models: AiModelOption[];
  requiresApiKey?: boolean;
  docsUrl?: string;
  baseUrlEnvVar?: string;
  supportsDynamicModels?: boolean;
}

export interface DeveloperSettings {
  aiProviderId: AiProviderId;
  aiModelId: string;
  foodSearchProviderId?: FoodSearchAdapterId;
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

export interface WeightInput {
  weight: number;
  unit?: WeightUnit;
  recordedAt?: string;
}

export interface WeightEntryRecord {
  id: string;
  profile_id: string;
  weight: number;
  unit: WeightUnit;
  recorded_at: string;
  created_at: string;
}

export type WeightImportFormatId = 'fitbit-weight-csv';

export interface WeightImportHandler {
  id: WeightImportFormatId;
  label: string;
  /**
   * Return a score between 0 and 1 indicating how confident the importer is that it can parse the file.
   * Values <= 0 are treated as "no match".
   */
  detect: (fileContent: string) => number;
  parse: (fileContent: string) => WeightInput[];
}

export interface Post {
  id: string;
  profileId: string;
  body?: string;
  mediaCount: number;
  createdAt: string;
  updatedAt: string;
  locationName?: string;
  locationLatitude?: number;
  locationLongitude?: number;
}

export interface PostRecord {
  id: string;
  profile_id: string;
  body: string | null;
  media_count: number;
  created_at: string;
  updated_at: string;
  location_name: string | null;
  location_latitude: number | string | null;
  location_longitude: number | string | null;
}

export interface PostMedia {
  id: string;
  postId: string;
  storagePath: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sortOrder: number;
  createdAt: string;
  publicUrl?: string;
}

export interface PostMediaRecord {
  id: string;
  post_id: string;
  storage_path: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
}

export interface PostWithMedia extends Post {
  media: PostMedia[];
}

export interface PostLocationInput extends GeoPoint {
  name?: string | null;
}

export type TrendRangePreset = '1w' | '1m' | '3m' | '1y' | 'all' | 'custom';

export interface DateRange {
  start?: string;
  end?: string;
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

export interface MacroProgressItem {
  key: 'protein' | 'carbs' | 'fat';
  label: string;
  consumed: number;
  goal: number;
  color: string;
}

export interface CalorieProgressCardProps {
  goal: number;
  consumed: number;
  exercise?: number;
  macros?: MacroProgressItem[];
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

export interface SentryRuntimeConfig {
  dsn?: string;
  environment?: string;
  enableLogs: boolean;
  sendDefaultPii: boolean;
  enableFeedback: boolean;
  enableReplay: boolean;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
}

export type AppStackScreenOptions = NativeStackNavigationOptions & {
  headerBackTitleVisible?: boolean;
};

