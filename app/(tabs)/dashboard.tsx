import { useMemo } from 'react';
import { Dimensions, StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import WeightTrendChart from '@/components/WeightTrendChart';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import useSWR from 'swr';
import type { WeightEntry } from '@/types';
import { fetchWeightEntries } from '@/services/weight';

const statCards = [
  { label: 'Calories', value: '845', change: '-13%', icon: 'gauge', color: '#5B9FED' },
  { label: 'Protein', value: '82g', change: '+6%', icon: 'bolt.heart', color: '#FFB347' },
  { label: 'Carbs', value: '140g', change: '+2%', icon: 'leaf.fill', color: '#34C759' },
  { label: 'Fat', value: '64g', change: '-4%', icon: 'drop.fill', color: '#FF6B6B' },
];

const CHART_WIDTH = Dimensions.get('window').width - 48;
const CHART_HEIGHT = 160;

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data: weightEntries = [] } = useSWR<WeightEntry[]>('dashboard-weight', () =>
    fetchWeightEntries(7)
  );

  const weightPoints = useMemo(() => {
    if (!weightEntries.length) return '';
    const sorted = [...weightEntries].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
    const weights = sorted.map((entry) => entry.weight);
    const minWeight = Math.min(...weights) - 2;
    const maxWeight = Math.max(...weights) + 2;
    const range = maxWeight - minWeight || 1;
    const stepX = sorted.length > 1 ? CHART_WIDTH / (sorted.length - 1) : CHART_WIDTH / 2;

    return sorted
      .map((entry, index) => {
        const x = sorted.length > 1 ? index * stepX : CHART_WIDTH / 2;
        const normalized = (entry.weight - minWeight) / range;
        const y = CHART_HEIGHT - normalized * CHART_HEIGHT;
        return `${x},${y}`;
      })
      .join(' ');
  }, [weightEntries]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" style={styles.heading}>
          Dashboard
        </ThemedText>
        <ThemedText style={styles.subheading}>At-a-glance look at your progress.</ThemedText>

        <View style={styles.grid}>
          {statCards.map((card) => (
            <ThemedView key={card.label} style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: card.color }]}>
                <IconSymbol name={card.icon as any} size={24} color="#fff" />
              </View>
              <ThemedText style={styles.cardLabel}>{card.label}</ThemedText>
              <ThemedText style={styles.cardValue}>{card.value}</ThemedText>
              <ThemedText style={styles.cardChange}>{card.change} vs. yesterday</ThemedText>
            </ThemedView>
          ))}
        </View>

        <WeightTrendChart
          title="Weight Trend"
          subtitle="Last week"
          points={weightPoints}
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

