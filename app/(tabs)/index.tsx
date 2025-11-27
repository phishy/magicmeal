import { useMemo, useCallback } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import useSWR from 'swr';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { MealEntry } from '@/types';
import { fetchMealsForDate, removeMeal as removeMealRecord } from '@/services/meals';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const dynamicStyles = createStyles(theme);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const {
    data: todaysMeals = [],
    mutate,
    isLoading,
  } = useSWR(['meals', today.toISOString()], () => fetchMealsForDate(today), {
    revalidateOnFocus: true,
  });

  useFocusEffect(
    useCallback(() => {
      mutate();
    }, [mutate])
  );

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
  const remaining = calorieGoal - totals.calories;

  const handleRemoveMeal = useCallback(
    async (mealId: string) => {
      try {
        await removeMealRecord(mealId);
        mutate();
      } catch (error) {
        console.error('Error removing meal:', error);
      }
    },
    [mutate]
  );

  return (
    <ScrollView style={dynamicStyles.container}>
      <ThemedView style={dynamicStyles.header}>
        <ThemedText type="title">Today</ThemedText>
        <ThemedText type="subtitle">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</ThemedText>
      </ThemedView>

      <View style={dynamicStyles.calorieCard}>
        <View style={dynamicStyles.calorieCircle}>
          <ThemedText style={dynamicStyles.calorieNumber}>{totals.calories}</ThemedText>
          <ThemedText style={dynamicStyles.calorieLabel}>of {calorieGoal}</ThemedText>
          <ThemedText style={dynamicStyles.remainingLabel}>
            {remaining > 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
          </ThemedText>
        </View>

        <View style={dynamicStyles.macrosRow}>
          <View style={dynamicStyles.macroItem}>
            <ThemedText style={dynamicStyles.macroValue}>{totals.protein}g</ThemedText>
            <ThemedText style={dynamicStyles.macroLabel}>Protein</ThemedText>
          </View>
          <View style={dynamicStyles.macroItem}>
            <ThemedText style={dynamicStyles.macroValue}>{totals.carbs}g</ThemedText>
            <ThemedText style={dynamicStyles.macroLabel}>Carbs</ThemedText>
          </View>
          <View style={dynamicStyles.macroItem}>
            <ThemedText style={dynamicStyles.macroValue}>{totals.fat}g</ThemedText>
            <ThemedText style={dynamicStyles.macroLabel}>Fat</ThemedText>
          </View>
        </View>
      </View>

      <ThemedView style={dynamicStyles.quickActions}>
        <ThemedText type="subtitle" style={dynamicStyles.sectionTitle}>Log Food</ThemedText>
        
        <View style={dynamicStyles.actionButtons}>
          <TouchableOpacity 
            style={dynamicStyles.actionButton}
            onPress={() => router.push('/barcode-scanner')}
          >
            <IconSymbol size={32} name="barcode.viewfinder" color={theme.primary} />
            <ThemedText style={dynamicStyles.actionText}>Scan Barcode</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={dynamicStyles.actionButton}
            onPress={() => router.push('/photo-scanner')}
          >
            <IconSymbol size={32} name="camera.fill" color={theme.success} />
            <ThemedText style={dynamicStyles.actionText}>Photo</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={dynamicStyles.actionButton}
            onPress={() => router.push('/food-search')}
          >
            <IconSymbol size={32} name="magnifyingglass" color={theme.secondary} />
            <ThemedText style={dynamicStyles.actionText}>Search</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ThemedView style={dynamicStyles.mealsSection}>
        <ThemedText type="subtitle" style={dynamicStyles.sectionTitle}>Today&apos;s Meals</ThemedText>
        
        {isLoading ? (
          <ThemedView style={dynamicStyles.emptyState}>
            <ThemedText style={dynamicStyles.emptyText}>Loading meals...</ThemedText>
          </ThemedView>
        ) : todaysMeals.length === 0 ? (
          <ThemedView style={dynamicStyles.emptyState}>
            <ThemedText style={dynamicStyles.emptyText}>No meals logged yet</ThemedText>
            <ThemedText style={dynamicStyles.emptySubtext}>Tap an option above to get started!</ThemedText>
          </ThemedView>
        ) : (
          todaysMeals.map((meal) => (
            <Swipeable
              key={meal.id}
              renderRightActions={() => (
                <View style={dynamicStyles.swipeActions}>
                  <TouchableOpacity
                    style={[dynamicStyles.swipeButton, dynamicStyles.deleteButton]}
                    onPress={() => handleRemoveMeal(meal.id)}
                  >
                    <IconSymbol size={24} name="trash.fill" color="#fff" />
                    <ThemedText style={dynamicStyles.swipeButtonText}>Remove</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            >
              <View style={dynamicStyles.mealCard}>
                <View style={dynamicStyles.mealHeader}>
                  <ThemedText style={dynamicStyles.mealName}>{meal.name}</ThemedText>
                  <ThemedText style={dynamicStyles.mealCalories}>{meal.calories} cal</ThemedText>
                </View>
                <View style={dynamicStyles.mealMacros}>
                  <ThemedText style={dynamicStyles.mealMacroText}>P: {meal.protein}g</ThemedText>
                  <ThemedText style={dynamicStyles.mealMacroText}>C: {meal.carbs}g</ThemedText>
                  <ThemedText style={dynamicStyles.mealMacroText}>F: {meal.fat}g</ThemedText>
                </View>
                <View style={dynamicStyles.mealFooter}>
                  <ThemedText style={dynamicStyles.mealTime}>
                    {new Date(meal.consumedAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </ThemedText>
                </View>
              </View>
            </Swipeable>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}

const createStyles = (theme: typeof Colors.light) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  calorieCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    backgroundColor: theme.card,
  },
  calorieCircle: {
    alignItems: 'center',
    marginBottom: 20,
  },
  calorieNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.text,
    lineHeight: 56,
  },
  calorieLabel: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  remainingLabel: {
    fontSize: 14,
    marginTop: 4,
    color: theme.text,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.text,
  },
  macroLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 4,
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.cardElevated,
    borderRadius: 12,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
  },
  mealsSection: {
    padding: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.textTertiary,
    marginTop: 8,
  },
  mealCard: {
    padding: 16,
    backgroundColor: theme.card,
    borderRadius: 12,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  mealMacroText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  mealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTime: {
    fontSize: 12,
    color: theme.textTertiary,
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  swipeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    gap: 6,
  },
  deleteButton: {
    backgroundColor: theme.danger,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  swipeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
