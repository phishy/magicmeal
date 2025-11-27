import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Svg, Polyline } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface WeightTrendChartProps {
  title?: string;
  subtitle?: string;
  points: string;
  emptyMessage?: string;
  height?: number;
}

const WeightTrendChart = memo(function WeightTrendChart({
  title = 'Weight',
  subtitle = 'Recent readings',
  points,
  emptyMessage = 'Log weights to see your trend line here.',
  height = 160,
}: WeightTrendChartProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <ThemedView style={styles(theme).graphCard}>
      <View style={styles(theme).graphHeader}>
        <View>
          <ThemedText type="title" style={styles(theme).graphTitle}>
            {title}
          </ThemedText>
          <ThemedText style={styles(theme).graphSubtitle}>{subtitle}</ThemedText>
        </View>
      </View>

      {!points ? (
        <View style={styles(theme).emptyGraph}>
          <ThemedText style={styles(theme).emptyGraphText}>{emptyMessage}</ThemedText>
        </View>
      ) : (
        <Svg width="100%" height={height}>
          <Polyline points={points} stroke={theme.primary} strokeWidth={3} fill="none" />
        </Svg>
      )}
    </ThemedView>
  );
});

export default WeightTrendChart;

const styles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    graphCard: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: theme.card,
    },
    graphHeader: {
      width: '100%',
      marginBottom: 12,
    },
    graphTitle: {
      fontSize: 20,
    },
    graphSubtitle: {
      color: theme.textSecondary,
      marginTop: 4,
    },
    emptyGraph: {
      height: 160,
      width: '100%',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    emptyGraphText: {
      textAlign: 'center',
      color: theme.textSecondary,
    },
  });

