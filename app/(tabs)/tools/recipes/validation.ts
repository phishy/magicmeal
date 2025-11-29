import type { SavedFoodInput } from '@/types';

import type { NutritionFieldKey, NutritionFormValues, NutritionPayload } from './nutritionFields';
import { buildNutritionPayload, nutritionPayloadHasCalories } from './nutritionFields';

export type FoodFormErrors = {
  description?: string;
  servingSize?: string;
  servingsPerContainer?: string;
  nutrition?: Partial<Record<NutritionFieldKey, string>>;
};

export type ValidateFoodFormArgs = {
  description: string;
  servingSize: string;
  servingsPerContainer: string;
  nutritionValues: NutritionFormValues;
};

export type NutritionPayloadWithCalories = NutritionPayload & Required<Pick<SavedFoodInput, 'calories'>>;

export type FoodFormValidationResult = {
  errors: FoodFormErrors;
  isValid: boolean;
  servingsValue?: number;
  nutritionPayload?: NutritionPayloadWithCalories;
};

const hasNutritionErrors = (nutritionErrors?: Partial<Record<NutritionFieldKey, string>>) =>
  Boolean(nutritionErrors && Object.keys(nutritionErrors).length > 0);

export const validateFoodForm = ({
  description,
  servingSize,
  servingsPerContainer,
  nutritionValues,
}: ValidateFoodFormArgs): FoodFormValidationResult => {
  const errors: FoodFormErrors = {};
  let servingsValue: number | undefined;

  if (!description.trim()) {
    errors.description = 'Description is required.';
  }

  if (!servingSize.trim()) {
    errors.servingSize = 'Serving size is required.';
  }

  const parsedServings = Number(servingsPerContainer);
  if (!Number.isFinite(parsedServings) || parsedServings <= 0) {
    errors.servingsPerContainer = 'Servings per container must be greater than 0.';
  } else {
    servingsValue = parsedServings;
  }

  const nutritionPayload = buildNutritionPayload(nutritionValues);
  let ensuredNutritionPayload: NutritionPayloadWithCalories | undefined;
  if (!nutritionPayloadHasCalories(nutritionPayload)) {
    errors.nutrition = {
      calories: 'Calories are required.',
    };
  } else {
    ensuredNutritionPayload = nutritionPayload;
  }

  const isValid =
    !errors.description &&
    !errors.servingSize &&
    !errors.servingsPerContainer &&
    !hasNutritionErrors(errors.nutrition) &&
    Boolean(ensuredNutritionPayload);

  return {
    errors,
    isValid,
    servingsValue,
    nutritionPayload: isValid ? ensuredNutritionPayload : undefined,
  };
};


