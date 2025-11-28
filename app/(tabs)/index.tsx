import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSWR from 'swr';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Theme } from '@/constants/theme';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { fetchMealsForDate, removeMeal as removeMealRecord } from '@/services/meals';
import type { FoodItem, MealEntry, MealType } from '@/types';

const mealOrder: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const getMealSubtitle = (meal: MealEntry) => {
  const rawFood = (meal.rawFood ?? undefined) as Partial<FoodItem> | undefined;
  const brand = typeof rawFood?.brand === 'string' ? rawFood.brand.trim() : undefined;
  const servingSource =
    meal.serving ?? (typeof rawFood?.serving === 'string' ? rawFood.serving : undefined);
  const serving = servingSource?.trim();

  return [brand, serving].filter(Boolean).join(', ');
};

const formatRelativeDayLabel = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';
  return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
};

const formatFullDate = (date: Date) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
    date
  );

const getMealTitle = (mealType: MealType) =>
  mealType === 'snack' ? 'Snacks' : mealType.charAt(0).toUpperCase() + mealType.slice(1);

const getMealSuggestionText = (mealType: MealType) =>
  `Add yesterday's ${getMealTitle(mealType).toLowerCase()}, swipe right to add meal`;

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const dynamicStyles = createStyles(theme);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const {
    data: todaysMeals = [],
    mutate,
    isLoading,
  } = useSWR(['meals', selectedDate.toISOString()], () => fetchMealsForDate(selectedDate), {
    revalidateOnFocus: true,
  });

  useFocusEffect(
    useCallback(() => {
      mutate();
    }, [mutate])
  );

  const groupedMeals = useMemo(() => {
    return mealOrder.reduce<Record<MealType, MealEntry[]>>((acc, mealType) => {
      acc[mealType] = todaysMeals.filter((meal) => meal.mealType === mealType);
      return acc;
    }, { breakfast: [], lunch: [], dinner: [], snack: [] });
  }, [todaysMeals]);

  const totals = useMemo(() => {
    return todaysMeals.reduce(
      (acc, meal) => {
        acc.calories += meal.calories;
        acc.protein += meal.protein;
        acc.carbs += meal.carbs;
        acc.fat += meal.fat;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [todaysMeals]);

  const calorieGoal = 2000;
  const exerciseCalories = 0;
  const remaining = calorieGoal - totals.calories;

const formatNumber = (value: number) => value.toLocaleString();

  const handleRemoveMeal = useCallback(
    async (mealId: string) => {
      try {
        await mutate(
          async (currentMeals) => {
            await removeMealRecord(mealId);
            return (currentMeals ?? []).filter((meal) => meal.id !== mealId);
          },
          { revalidate: false, populateCache: true, rollbackOnError: true }
        );
      } catch (error) {
        console.error('Error removing meal:', error);
      }
    },
    [mutate]
  );

  const goToPreviousDay = () => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  };

  const goToNextDay = () => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  };

  const handleAddFood = useCallback(
    (mealType: MealType) => {
      router.push({ pathname: '/food-search', params: { meal: mealType } });
    },
    [router]
  );

  return (
    <SafeAreaView style={dynamicStyles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={dynamicStyles.container} contentContainerStyle={dynamicStyles.content}>
      <View style={dynamicStyles.dateToolbar}>
        <TouchableOpacity
          style={dynamicStyles.dateArrow}
          onPress={goToPreviousDay}
          accessibilityLabel="Previous day"
        >
          <IconSymbol name="chevron.left" size={18} color={theme.text} />
        </TouchableOpacity>
        <View style={dynamicStyles.dateCenter}>
          <TouchableOpacity style={dynamicStyles.dateButton} activeOpacity={0.8}>
            <ThemedText style={dynamicStyles.dateLabel}>
              {formatRelativeDayLabel(selectedDate)}
            </ThemedText>
            <IconSymbol name="chevron.down" size={14} color={theme.textSecondary} />
          </TouchableOpacity>
          <ThemedText style={dynamicStyles.dateSubLabel}>{formatFullDate(selectedDate)}</ThemedText>
        </View>
        <TouchableOpacity
          style={dynamicStyles.dateArrow}
          onPress={goToNextDay}
          accessibilityLabel="Next day"
        >
          <IconSymbol name="chevron.right" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.summaryCard}>


        <View style={dynamicStyles.equationRow}>
          <EquationBlock label="Goal" value={formatNumber(calorieGoal)} />
          <ThemedText style={dynamicStyles.equationOperator}>-</ThemedText>
          <EquationBlock label="Food" value={formatNumber(totals.calories)} />
          <ThemedText style={dynamicStyles.equationOperator}>+</ThemedText>
          <EquationBlock label="Exercise" value={formatNumber(exerciseCalories)} />
          <ThemedText style={dynamicStyles.equationOperator}>=</ThemedText>
          <EquationBlock
            label="Remaining"
            value={formatNumber(remaining)}
            highlight
          />
        </View>
      </View>

      <View style={dynamicStyles.mealCards}>
        {mealOrder.map((mealType) => {
          const meals = groupedMeals[mealType];
          return (
            <ThemedView key={mealType} style={dynamicStyles.mealCard}>
              <View style={dynamicStyles.mealCardHeader}>
                <ThemedText style={dynamicStyles.mealCardTitle}>
                  {getMealTitle(mealType)}
                </ThemedText>
                <TouchableOpacity>
                  <IconSymbol name="ellipsis" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <ThemedText style={dynamicStyles.mealCardHint}>
                {getMealSuggestionText(mealType)}
              </ThemedText>
              <TouchableOpacity
                style={dynamicStyles.addFoodButton}
                onPress={() => handleAddFood(mealType)}
              >
                <ThemedText style={dynamicStyles.addFoodLabel}>Add Food</ThemedText>
              </TouchableOpacity>

              {meals.length > 0 && (
                <View style={dynamicStyles.loggedList}>
                  {meals.map((meal, index) => {
                    const subtitle = getMealSubtitle(meal);
                    const isLast = index === meals.length - 1;
                    return (
                      <Swipeable
                        key={meal.id}
                        renderRightActions={() => (
                          <View style={dynamicStyles.swipeActions}>
                            <TouchableOpacity
                              style={[dynamicStyles.swipeButton, dynamicStyles.deleteButton]}
                              onPress={() => handleRemoveMeal(meal.id)}
                            >
                              <IconSymbol size={20} name="trash.fill" color={theme.onDanger} />
                              <ThemedText style={dynamicStyles.swipeButtonText}>Delete</ThemedText>
                            </TouchableOpacity>
                          </View>
                        )}
                      >
                        <View
                          style={[
                            dynamicStyles.loggedItem,
                            !isLast && dynamicStyles.loggedItemDivider,
                          ]}
                        >
                          <View style={dynamicStyles.loggedTextGroup}>
                            <ThemedText style={dynamicStyles.loggedTitle}>{meal.name}</ThemedText>
                            {subtitle?.length ? (
                              <ThemedText style={dynamicStyles.loggedSubtitle}>{subtitle}</ThemedText>
                            ) : null}
                          </View>
                          <ThemedText style={dynamicStyles.loggedCalories}>
                            {meal.calories} cal
                          </ThemedText>
                        </View>
                      </Swipeable>
                    );
                  })}
                </View>
              )}
            </ThemedView>
          );
        })}

        {!isLoading && todaysMeals.length === 0 && (
          <ThemedView style={dynamicStyles.emptyState}>
            <ThemedText style={dynamicStyles.emptyText}>No meals logged yet</ThemedText>
            <ThemedText style={dynamicStyles.emptySubtext}>
              Tap a meal card above to start adding food.
            </ThemedText>
          </ThemedView>
        )}

        {isLoading && (
          <ThemedView style={dynamicStyles.emptyState}>
            <ThemedText style={dynamicStyles.emptyText}>Loading meals...</ThemedText>
          </ThemedView>
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EquationBlock({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={equationStyles.block}>
      <ThemedText
        style={[
          equationStyles.value,
          highlight && { color: theme.primary },
        ]}
      >
        {value}
      </ThemedText>
      <ThemedText
        style={[
          equationStyles.label,
          highlight && { color: theme.primary },
        ]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const equationStyles = StyleSheet.create({
  block: {
    alignItems: 'center',
    minWidth: 52,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
      paddingBottom: 40,
    },
    dateToolbar: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    dateArrow: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
    },
    dateCenter: {
      alignItems: 'center',
      gap: 4,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dateLabel: {
      fontSize: 16,
      fontWeight: '600',
    },
    dateSubLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    summaryCard: {
      marginHorizontal: 20,
      marginTop: 4,
      marginBottom: 12,
      borderRadius: 20,
      padding: 20,
      backgroundColor: theme.card,
      gap: 8,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    equationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'nowrap',
      justifyContent: 'space-between',
    },
    equationOperator: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    summaryDots: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
    },
    summaryDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.textSecondary,
      opacity: 0.4,
    },
    summaryDotActive: {
      opacity: 1,
    },
    mealCards: {
      paddingHorizontal: 20,
      gap: 16,
    },
    mealCard: {
      borderRadius: 18,
      padding: 20,
      gap: 12,
      backgroundColor: theme.card,
    },
    mealCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    mealCardTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    mealCardHint: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    addFoodButton: {
      alignSelf: 'flex-start',
      paddingVertical: 6,
    },
    addFoodLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    loggedList: {
      borderRadius: 14,
      backgroundColor: theme.cardElevated,
    },
    loggedItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 12,
      gap: 12,
    },
    loggedItemDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    loggedTextGroup: {
      flexShrink: 1,
      gap: 4,
    },
    loggedTitle: {
      fontSize: 15,
      fontWeight: '600',
    },
    loggedSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    loggedCalories: {
      fontSize: 15,
      fontWeight: '600',
    },
    swipeActions: {
      flexDirection: 'row',
      alignItems: 'center',
      height: '100%',
    },
    swipeButton: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 88,
      height: '100%',
      gap: 4,
    },
    deleteButton: {
      backgroundColor: theme.danger,
      borderTopLeftRadius: 14,
      borderBottomLeftRadius: 14,
      borderTopRightRadius: 14,
      borderBottomRightRadius: 14,
    },
    swipeButtonText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.onDanger,
    },
    emptyState: {
      padding: 32,
      alignItems: 'center',
      borderRadius: 16,
      backgroundColor: theme.card,
      gap: 8,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
    },
    emptySubtext: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });
