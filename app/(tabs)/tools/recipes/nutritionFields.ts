import type { SavedFood, SavedFoodInput } from '@/types';

export type NutritionFieldKey =
  | 'calories'
  | 'totalFat'
  | 'saturatedFat'
  | 'polyunsaturatedFat'
  | 'monounsaturatedFat'
  | 'transFat'
  | 'cholesterol'
  | 'sodium'
  | 'potassium'
  | 'totalCarbohydrates'
  | 'dietaryFiber'
  | 'sugars'
  | 'addedSugars'
  | 'sugarAlcohols'
  | 'protein';

export type NutritionFieldConfig = {
  key: NutritionFieldKey;
  label: string;
  unit?: string;
  parser: 'int' | 'float';
  required?: boolean;
};

const nutritionFieldConfigsConst = [
  { key: 'calories', label: 'Calories', unit: '', required: true, parser: 'int' },
  { key: 'totalFat', label: 'Total Fat', unit: 'g', parser: 'float' },
  { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g', parser: 'float' },
  { key: 'polyunsaturatedFat', label: 'Polyunsaturated Fat', unit: 'g', parser: 'float' },
  { key: 'monounsaturatedFat', label: 'Monounsaturated', unit: 'g', parser: 'float' },
  { key: 'transFat', label: 'Trans Fat', unit: 'g', parser: 'float' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', parser: 'int' },
  { key: 'sodium', label: 'Sodium', unit: 'mg', parser: 'int' },
  { key: 'potassium', label: 'Potassium', unit: 'mg', parser: 'int' },
  { key: 'totalCarbohydrates', label: 'Total Carbohydrates', unit: 'g', parser: 'float' },
  { key: 'dietaryFiber', label: 'Dietary Fiber', unit: 'g', parser: 'float' },
  { key: 'sugars', label: 'Sugars', unit: 'g', parser: 'float' },
  { key: 'addedSugars', label: 'Added Sugars', unit: 'g', parser: 'float' },
  { key: 'sugarAlcohols', label: 'Sugar Alcohols', unit: 'g', parser: 'float' },
  { key: 'protein', label: 'Protein', unit: 'g', parser: 'float' },
] as const;

export const nutritionFieldConfigs: readonly NutritionFieldConfig[] = nutritionFieldConfigsConst;

export type NutritionFormValues = Record<NutritionFieldKey, string>;

export const createEmptyNutritionValues = (): NutritionFormValues =>
  nutritionFieldConfigs.reduce(
    (acc, field) => ({
      ...acc,
      [field.key]: '',
    }),
    {} as NutritionFormValues
  );

const formatNumber = (value?: number) => {
  if (value === undefined || value === null) return '';
  if (Number.isInteger(value)) return value.toString();
  return value.toString();
};

export const createNutritionValuesFromFood = (food?: SavedFood): NutritionFormValues => {
  const base = createEmptyNutritionValues();
  if (!food) return base;

  return {
    ...base,
    calories: formatNumber(food.calories),
    totalFat: formatNumber(food.totalFat),
    saturatedFat: formatNumber(food.saturatedFat),
    polyunsaturatedFat: formatNumber(food.polyunsaturatedFat),
    monounsaturatedFat: formatNumber(food.monounsaturatedFat),
    transFat: formatNumber(food.transFat),
    cholesterol: formatNumber(food.cholesterol),
    sodium: formatNumber(food.sodium),
    potassium: formatNumber(food.potassium),
    totalCarbohydrates: formatNumber(food.totalCarbohydrates),
    dietaryFiber: formatNumber(food.dietaryFiber),
    sugars: formatNumber(food.sugars),
    addedSugars: formatNumber(food.addedSugars),
    sugarAlcohols: formatNumber(food.sugarAlcohols),
    protein: formatNumber(food.protein),
  };
};

export type NutritionPayload = Partial<Pick<SavedFoodInput, NutritionFieldKey>>;

export const buildNutritionPayload = (values: NutritionFormValues): NutritionPayload => {
  const payload: NutritionPayload = {};

  nutritionFieldConfigs.forEach((field) => {
    const rawValue = values[field.key]?.trim();
    if (!rawValue) return;
    const parsed =
      field.parser === 'int' ? parseInt(rawValue, 10) : parseFloat(rawValue);
    if (Number.isFinite(parsed)) {
      payload[field.key] = parsed;
    }
  });

  return payload;
};

export const nutritionPayloadHasCalories = (
  payload: NutritionPayload
): payload is NutritionPayload & Required<Pick<SavedFoodInput, 'calories'>> =>
  typeof payload.calories === 'number' && Number.isFinite(payload.calories);

