import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Theme } from '@/constants/theme';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { consumeFoodLogCandidate, getFoodLogCandidate } from '@/lib/pendingFoodLog';
import { createMeal } from '@/services/meals';
import type { FoodLogCandidate, MealType } from '@/types';

export const options = {
  headerShown: false,
};

export default function FoodDetailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const [candidate, setCandidate] = useState<FoodLogCandidate | null>(null);
  const [servingLabel, setServingLabel] = useState('');
  const [servingsInput, setServingsInput] = useState('1');
  const [mealType, setMealType] = useState<MealType>(suggestMealType());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    const pending = getFoodLogCandidate(token);
    if (!pending) {
      Alert.alert('Not found', 'We could not find that food. Please scan again.');
      router.back();
      return;
    }
    setCandidate(pending);
    setServingLabel(pending.servingSize ?? '1 serving');
    setServingsInput(String(pending.defaultServings ?? 1));
  }, [token, router]);

  const servings = Math.max(0, Number(servingsInput) || 0);
  const scaledNutrition = useMemo(() => scaleNutrition(candidate?.nutrition, servings), [candidate, servings]);
  const canSave = Boolean(candidate) && servings > 0 && !saving;

  const handleAddToLog = async () => {
    if (!candidate) return;
    if (servings <= 0) {
      Alert.alert('Servings required', 'Enter how many servings you ate.');
      return;
    }

    setSaving(true);
    try {
      await createMeal({
        name: candidate.name,
        serving: servings === 1 ? servingLabel : `${servings} × ${servingLabel || 'serving'}`,
        calories: Math.round(scaledNutrition.calories),
        protein: Math.round(scaledNutrition.protein),
        carbs: Math.round(scaledNutrition.carbs),
        fat: Math.round(scaledNutrition.fat),
        mealType,
        rawFood: {
          source: candidate.source,
          servings,
          servingSize: servingLabel,
          nutrition: candidate.nutrition,
          scaledNutrition,
          barcode: candidate.barcode,
          original: candidate.rawFood,
        },
      });
      consumeFoodLogCandidate(token);
      router.replace('/(tabs)');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save this food. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!candidate) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.empty}>
          <ThemedText style={styles.emptyTitle}>Food not loaded</ThemedText>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <ThemedText style={styles.primaryButtonText}>Go back</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={styles.backButton}>‹</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Add Food</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ThemedView style={styles.productCard}>
          <ThemedText style={styles.matchLabel}>
            This barcode was matched to: “{candidate.name}”
          </ThemedText>
          <TouchableOpacity onPress={() => router.push('/food-search')}>
            <ThemedText style={styles.linkText}>Find a better match</ThemedText>
          </TouchableOpacity>
          <View style={styles.productTitleBlock}>
            <ThemedText type="title">{candidate.name.toLowerCase()}</ThemedText>
            {candidate.brand ? (
              <ThemedText style={styles.brandText}>{candidate.brand}</ThemedText>
            ) : null}
          </View>
        </ThemedView>

        <ThemedView style={styles.inputsCard}>
          <Field label="Serving Size">
            <TextInput
              style={styles.textInput}
              value={servingLabel}
              onChangeText={setServingLabel}
              placeholder="e.g. 2 tbsp"
              placeholderTextColor={theme.textTertiary}
            />
          </Field>
          <Field label="Number of Servings">
            <TextInput
              style={styles.textInput}
              value={servingsInput}
              onChangeText={setServingsInput}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={theme.textTertiary}
            />
          </Field>
          <Field label="Meal">
            <MealToggle value={mealType} onChange={setMealType} />
          </Field>
        </ThemedView>

        <MacroSummary nutrition={scaledNutrition} />

        <NutritionFacts nutrition={scaledNutrition} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, !canSave && styles.primaryButtonDisabled]}
          disabled={!canSave}
          onPress={handleAddToLog}
        >
          {saving ? (
            <ThemedText style={styles.primaryButtonText}>Adding…</ThemedText>
          ) : (
            <ThemedText style={styles.primaryButtonText}>Add to log</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <ThemedText style={{ fontSize: 13, opacity: 0.8 }}>{label}</ThemedText>
      {children}
    </View>
  );
}

function MealToggle({
  value,
  onChange,
}: {
  value: MealType;
  onChange: (meal: MealType) => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={toggleStyles.row}>
      {mealOptions.map((meal) => {
        const isActive = meal === value;
        return (
          <TouchableOpacity
            key={meal}
            style={[
              toggleStyles.chip,
              {
                borderColor: isActive ? theme.primary : theme.border,
                backgroundColor: isActive ? theme.primary : 'transparent',
              },
            ]}
            onPress={() => onChange(meal)}
          >
            <ThemedText
              style={[
                toggleStyles.chipLabel,
                { color: isActive ? theme.onPrimary : theme.text },
              ]}
            >
              {meal.charAt(0).toUpperCase() + meal.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MacroSummary({ nutrition }: { nutrition: ScaledNutrition }) {
  const { theme } = useAppTheme();
  return (
    <ThemedView style={[macroStyles.card, { backgroundColor: theme.card }]}>
      <ThemedText style={macroStyles.title}>Summary</ThemedText>
      <View style={macroStyles.macrosRow}>
        <MacroBadge label="Calories" value={`${Math.round(nutrition.calories)} cal`} color="#c084fc" />
        <MacroBadge label="Carbs" value={`${nutrition.carbs.toFixed(1)} g`} color="#38bdf8" />
        <MacroBadge label="Fat" value={`${nutrition.fat.toFixed(1)} g`} color="#f472b6" />
        <MacroBadge label="Protein" value={`${nutrition.protein.toFixed(1)} g`} color="#34d399" />
      </View>
    </ThemedView>
  );
}

function MacroBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[macroStyles.badge, { borderColor: color }]}>
      <ThemedText style={[macroStyles.badgeValue, { color }]}>{value}</ThemedText>
      <ThemedText style={macroStyles.badgeLabel}>{label}</ThemedText>
    </View>
  );
}

function NutritionFacts({ nutrition }: { nutrition: ScaledNutrition }) {
  const { theme } = useAppTheme();
  const list = [
    { label: 'Calories', value: `${Math.round(nutrition.calories)} ` },
    { label: 'Total Fat', value: `${nutrition.fat.toFixed(1)} g` },
    { label: 'Saturated Fat', value: `${nutrition.saturatedFat.toFixed(1)} g` },
    { label: 'Trans Fat', value: `${nutrition.transFat.toFixed(1)} g` },
    { label: 'Polyunsaturated Fat', value: `${nutrition.polyunsaturatedFat.toFixed(1)} g` },
    { label: 'Monounsaturated Fat', value: `${nutrition.monounsaturatedFat.toFixed(1)} g` },
    { label: 'Cholesterol', value: `${nutrition.cholesterol.toFixed(1)} mg` },
    { label: 'Sodium', value: `${nutrition.sodium.toFixed(1)} mg` },
    { label: 'Total Carbohydrates', value: `${nutrition.carbs.toFixed(1)} g` },
    { label: 'Dietary Fiber', value: `${nutrition.fiber.toFixed(1)} g` },
    { label: 'Sugars', value: `${nutrition.sugar.toFixed(1)} g` },
    { label: 'Protein', value: `${nutrition.protein.toFixed(1)} g` },
  ];

  return (
    <ThemedView style={[factsStyles.card, { backgroundColor: theme.card }]}>
      <View style={factsStyles.header}>
        <ThemedText style={factsStyles.headerTitle}>Nutrition Facts</ThemedText>
        <TouchableOpacity>
          <MaterialIcons name="expand-less" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
      {list.map((item) => (
        <View key={item.label} style={factsStyles.row}>
          <ThemedText style={factsStyles.rowLabel}>{item.label}</ThemedText>
          <ThemedText style={factsStyles.rowValue}>{item.value}</ThemedText>
        </View>
      ))}
    </ThemedView>
  );
}

type ScaledNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturatedFat: number;
  polyunsaturatedFat: number;
  monounsaturatedFat: number;
  transFat: number;
  cholesterol: number;
};

function scaleNutrition(
  nutrition: FoodLogCandidate['nutrition'] | undefined,
  servings: number
): ScaledNutrition {
  const safeNutrition = nutrition ?? {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    saturatedFat: 0,
    polyunsaturatedFat: 0,
    monounsaturatedFat: 0,
    transFat: 0,
    cholesterol: 0,
  };
  const scale = servings > 0 ? servings : 0;
  const multiply = (value: number | undefined) => Number(((value ?? 0) * scale).toFixed(2));

  return {
    calories: multiply(safeNutrition.calories),
    protein: multiply(safeNutrition.protein),
    carbs: multiply(safeNutrition.carbs),
    fat: multiply(safeNutrition.fat),
    fiber: multiply(safeNutrition.fiber),
    sugar: multiply(safeNutrition.sugar),
    sodium: multiply(safeNutrition.sodium),
    saturatedFat: multiply(safeNutrition.saturatedFat),
    polyunsaturatedFat: multiply(safeNutrition.polyunsaturatedFat),
    monounsaturatedFat: multiply(safeNutrition.monounsaturatedFat),
    transFat: multiply(safeNutrition.transFat),
    cholesterol: multiply(safeNutrition.cholesterol),
  };
}

function suggestMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
}

const mealOptions: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

const macroStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  macrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badge: {
    flexGrow: 1,
    minWidth: 120,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  badgeValue: {
    fontWeight: '700',
    fontSize: 16,
  },
  badgeLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
});

const factsStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowLabel: {
    fontSize: 14,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: 20,
      gap: 16,
      paddingBottom: 120,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      fontSize: 32,
      fontWeight: 'bold',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    headerSpacer: {
      width: 32,
    },
    productCard: {
      borderRadius: 16,
      padding: 16,
      gap: 8,
      backgroundColor: theme.card,
    },
    matchLabel: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    linkText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    productTitleBlock: {
      marginTop: 8,
      gap: 4,
    },
    brandText: {
      color: theme.textSecondary,
      textTransform: 'capitalize',
    },
    inputsCard: {
      borderRadius: 16,
      padding: 16,
      gap: 16,
      backgroundColor: theme.card,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.cardElevated,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      backgroundColor: theme.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    primaryButton: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      backgroundColor: theme.primary,
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: theme.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
  });


