import CalorieProgressCard from '@/components/CalorieProgressCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import WeightTrendChart from '@/components/WeightTrendChart';
import type { Theme } from '@/constants/theme';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { fetchMealsForDate } from '@/services/meals';
import { fetchWeightEntries } from '@/services/weight';
import type { MacroProgressItem, MealEntry, WeightEntry } from '@/types';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSWR from 'swr';

const CHART_HEIGHT = 160;
const MACRO_SPLIT = {
  protein: 0.3,
  carbs: 0.4,
  fat: 0.3,
} as const;

export default function DashboardScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const {
    data: todaysMeals = [],
    isLoading: mealsLoading,
  } = useSWR<MealEntry[]>(['dashboard-meals', today.toISOString()], () =>
    fetchMealsForDate(today)
  );

  const { data: weightEntries = [] } = useSWR<WeightEntry[]>('dashboard-weight', () =>
    fetchWeightEntries(7)
  );

  const latestWeightInfo = useMemo(() => {
    if (!weightEntries.length) {
      return {
        value: '--',
        detail: 'No weight entries yet',
      };
    }

    const entry = weightEntries[0];
    const unit = entry.unit ?? 'lb';
    const recordedDate = new Date(entry.recordedAt);
    const formattedDate = Number.isNaN(recordedDate.getTime())
      ? entry.recordedAt
      : recordedDate.toLocaleDateString();

    return {
      value: `${entry.weight} ${unit}`,
      detail: `Recorded ${formattedDate}`,
    };
  }, [weightEntries]);

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

  const macroGoals = useMemo(() => {
    const safeGoal = Math.max(calorieGoal, 1);
    return {
      protein: Math.round((safeGoal * MACRO_SPLIT.protein) / 4),
      carbs: Math.round((safeGoal * MACRO_SPLIT.carbs) / 4),
      fat: Math.round((safeGoal * MACRO_SPLIT.fat) / 9),
    };
  }, [calorieGoal]);

  const macroProgress = useMemo<MacroProgressItem[]>(
    () => [
      {
        key: 'carbs',
        label: 'Carbohydrates',
        consumed: totals.carbs,
        goal: macroGoals.carbs,
        color: theme.metricCarbs,
      },
      {
        key: 'fat',
        label: 'Fat',
        consumed: totals.fat,
        goal: macroGoals.fat,
        color: theme.metricFat,
      },
      {
        key: 'protein',
        label: 'Protein',
        consumed: totals.protein,
        goal: macroGoals.protein,
        color: theme.metricProtein,
      },
    ],
    [
      macroGoals.carbs,
      macroGoals.fat,
      macroGoals.protein,
      theme.metricCarbs,
      theme.metricFat,
      theme.metricProtein,
      totals.carbs,
      totals.fat,
      totals.protein,
    ]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" style={styles.heading}>
          Dashboard
        </ThemedText>
        <ThemedText style={styles.subheading}>At-a-glance look at your progress.</ThemedText>

        <CalorieProgressCard
          goal={calorieGoal}
          consumed={totals.calories}
          exercise={0}
          macros={macroProgress}
        />

        <View style={styles.grid}>
          <ThemedView style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: theme.secondary }]}>
              <IconSymbol name="scalemass.fill" size={24} color={theme.onSecondary} />
            </View>
            <ThemedText style={styles.cardLabel}>Last Weight</ThemedText>
            <ThemedText style={styles.cardValue}>{latestWeightInfo.value}</ThemedText>
            <ThemedText style={styles.cardChange}>{latestWeightInfo.detail}</ThemedText>
          </ThemedView>

          <ThemedView style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: theme.metricProtein }]}>
              <IconSymbol name="bolt.heart" size={24} color={theme.onAccent} />
            </View>
            <ThemedText style={styles.cardLabel}>Protein</ThemedText>
            <ThemedText style={styles.cardValue}>{totals.protein}g</ThemedText>
            <ThemedText style={styles.cardChange}>Today&apos;s total</ThemedText>
          </ThemedView>

          <ThemedView style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: theme.metricCarbs }]}>
              <IconSymbol name="leaf.fill" size={24} color={theme.onAccent} />
            </View>
            <ThemedText style={styles.cardLabel}>Carbs</ThemedText>
            <ThemedText style={styles.cardValue}>{totals.carbs}g</ThemedText>
            <ThemedText style={styles.cardChange}>Today&apos;s total</ThemedText>
          </ThemedView>

          <ThemedView style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: theme.metricFat }]}>
              <IconSymbol name="drop.fill" size={24} color={theme.onAccent} />
            </View>
            <ThemedText style={styles.cardLabel}>Fat</ThemedText>
            <ThemedText style={styles.cardValue}>{totals.fat}g</ThemedText>
            <ThemedText style={styles.cardChange}>Today&apos;s total</ThemedText>
          </ThemedView>
        </View>

        <WeightTrendChart
          title="Weight Trend"
          subtitle="Last week"
          entries={weightEntries}
          emptyMessage="No weight data yet."
          height={CHART_HEIGHT}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: {
      padding: 20,
      gap: 16,
    },
    heading: {
      marginTop: 8,
    },
    subheading: {
      color: theme.textSecondary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 12,
    },
    card: {
      flexBasis: '48%',
      padding: 16,
      borderRadius: 16,
      backgroundColor: theme.card,
      gap: 6,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardLabel: {
      color: theme.textSecondary,
      fontSize: 14,
    },
    cardValue: {
      fontSize: 24,
      fontWeight: '700',
    },
    cardChange: {
      color: theme.textSecondary,
      fontSize: 12,
    },
  });

