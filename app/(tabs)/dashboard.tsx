import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import WeightTrendChart from '@/components/WeightTrendChart';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchMealsForDate } from '@/services/meals';
import { fetchWeightEntries } from '@/services/weight';
import type { MealEntry, WeightEntry } from '@/types';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSWR from 'swr';

const CHART_HEIGHT = 160;

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" style={styles.heading}>
          Dashboard
        </ThemedText>
        <ThemedText style={styles.subheading}>At-a-glance look at your progress.</ThemedText>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.card} onPress={() => router.push('/food-search')}>
            <View style={[styles.iconWrap, { backgroundColor: theme.primary }]}>
              <IconSymbol name="magnifyingglass" size={24} color="#fff" />
            </View>
            <ThemedText style={styles.cardLabel}>Calories</ThemedText>
            <ThemedText style={styles.cardValue}>{totals.calories}</ThemedText>
            <ThemedText style={styles.cardChange}>{remaining > 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}</ThemedText>
          </TouchableOpacity>

          <ThemedView style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: '#FFB347' }]}>
              <IconSymbol name="bolt.heart" size={24} color="#fff" />
            </View>
            <ThemedText style={styles.cardLabel}>Protein</ThemedText>
            <ThemedText style={styles.cardValue}>{totals.protein}g</ThemedText>
            <ThemedText style={styles.cardChange}>Today&apos;s total</ThemedText>
          </ThemedView>

          <ThemedView style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: '#34C759' }]}>
              <IconSymbol name="leaf.fill" size={24} color="#fff" />
            </View>
            <ThemedText style={styles.cardLabel}>Carbs</ThemedText>
            <ThemedText style={styles.cardValue}>{totals.carbs}g</ThemedText>
            <ThemedText style={styles.cardChange}>Today&apos;s total</ThemedText>
          </ThemedView>

          <ThemedView style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: '#FF6B6B' }]}>
              <IconSymbol name="drop.fill" size={24} color="#fff" />
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

const createStyles = (theme: typeof Colors.light) =>
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

