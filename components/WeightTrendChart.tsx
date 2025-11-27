import { memo, useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Theme } from '@/constants/theme';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import type { WeightEntry, WeightTrendChartProps } from '@/types';

const DEFAULT_HEIGHT = 160;
const MIN_CHART_WIDTH = 160;
const Y_AXIS_WIDTH = 48;
const DEFAULT_LABEL_COUNT = 4;

const WeightTrendChart = memo(function WeightTrendChart({
  entries,
  title = 'Weight',
  subtitle = 'Recent readings',
  emptyMessage = 'Log weights to see your trend line here.',
  height = DEFAULT_HEIGHT,
  showYAxisLabels = true,
  showXAxisLabels = true,
  yAxisLabelCount = DEFAULT_LABEL_COUNT,
  wrapInCard = true,
  topContent,
  style,
}: WeightTrendChartProps) {
  const { theme } = useAppTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = event.nativeEvent.layout.width;
      setContainerWidth((prev) => {
        if (Math.abs(prev - nextWidth) < 1) {
          return prev;
        }
        return nextWidth;
      });
    },
    [setContainerWidth]
  );

  const orderedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      ),
    [entries]
  );

  const chartStats = useMemo(() => {
    if (!orderedEntries.length) return null;
    const values = orderedEntries.map((entry) => entry.weight);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max(1, (max - min) * 0.05);
    return {
      min,
      max,
      offset: min - padding,
    };
  }, [orderedEntries]);

  const chartData = useMemo(() => {
    if (!chartStats) return [];
    return orderedEntries.map((entry) => ({
      value: Number((entry.weight - chartStats.offset).toFixed(3)),
      entry,
    }));
  }, [orderedEntries, chartStats]);

  const yAxisLabels = useMemo(() => {
    if (!chartStats || !showYAxisLabels) return [];
    const ticks = Math.max(yAxisLabelCount, 2);
    const range = chartStats.max - chartStats.min || 1;
    return Array.from({ length: ticks }, (_, idx) => {
      const value = chartStats.max - (idx / (ticks - 1)) * range;
      return value.toFixed(1);
    });
  }, [chartStats, showYAxisLabels, yAxisLabelCount]);

  const xAxisLabelTexts = useMemo(() => {
    if (!orderedEntries.length || !showXAxisLabels) return [];
    const labelCount = Math.min(6, orderedEntries.length);
    const indices = new Set(
      Array.from({ length: labelCount }, (_, idx) =>
        Math.round((idx / Math.max(labelCount - 1, 1)) * (orderedEntries.length - 1))
      )
    );
    return orderedEntries.map((entry, idx) =>
      indices.has(idx)
        ? new Date(entry.recordedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })
        : ''
    );
  }, [orderedEntries, showXAxisLabels]);

  const chartWidth = useMemo(() => {
    if (!containerWidth) return MIN_CHART_WIDTH;
    const gutter = showYAxisLabels ? Y_AXIS_WIDTH + 12 : 0;
    return Math.max(MIN_CHART_WIDTH, containerWidth - gutter);
  }, [containerWidth, showYAxisLabels]);

  const spacing =
    orderedEntries.length > 1 ? chartWidth / (orderedEntries.length - 1) : chartWidth / 2;

  const Container = wrapInCard ? ThemedView : View;

  return (
    <Container
      style={[
        wrapInCard ? styles(theme).graphCard : styles(theme).graphBody,
        style,
      ]}
      onLayout={handleLayout}
    >
      {topContent ? <View style={styles(theme).topContent}>{topContent}</View> : null}

      <View style={styles(theme).graphHeader}>
        <View>
          <ThemedText type="title" style={styles(theme).graphTitle}>
            {title}
          </ThemedText>
          <ThemedText style={styles(theme).graphSubtitle}>{subtitle}</ThemedText>
        </View>
      </View>

      {!orderedEntries.length ? (
        <View style={[styles(theme).emptyGraph, { height }]}>
          <ThemedText style={styles(theme).emptyGraphText}>{emptyMessage}</ThemedText>
        </View>
      ) : (
        <View style={styles(theme).chartRow}>
          {showYAxisLabels ? (
            <View style={[styles(theme).yAxisColumn, { height }]}>
              {yAxisLabels.map((label, idx) => (
                <ThemedText key={`y-axis-${label}-${idx}`} style={styles(theme).yAxisLabel}>
                  {label}
                </ThemedText>
              ))}
            </View>
          ) : null}

          <View style={[styles(theme).chartWrapper, { width: chartWidth }]}>
            <LineChart
              data={chartData}
              width={chartWidth}
              height={height}
              areaChart
              adjustToWidth
              initialSpacing={0}
              endSpacing={0}
              disableScroll
              spacing={spacing}
              thickness={3}
              color={theme.primary}
              startFillColor={theme.primary}
              startOpacity={0.1}
              endFillColor={theme.card}
              endOpacity={0.01}
              yAxisLabelWidth={0}
              dataPointsColor={theme.primary}
              hideDataPoints
              curved
              xAxisColor={theme.separator}
              yAxisColor="transparent"
              xAxisLabelTexts={xAxisLabelTexts}
              xAxisLabelTextStyle={styles(theme).xAxisLabel}
              showVerticalLines={false}
              hideRules
              hideYAxisText
              showScrollIndicator={false}
              pointerConfig={{
                pointerStripUptoDataPoint: true,
                pointerStripColor: theme.border,
                pointerStripWidth: 1,
                pointerColor: theme.primary,
                pointerLabelComponent: (items: { value: number; entry: WeightEntry }[]) => {
                  const item = items?.[0];
                  if (!item) return null;
                  const entry = item.entry as WeightEntry;
                  return (
                    <View style={styles(theme).chartTooltip}>
                      <ThemedText style={styles(theme).chartTooltipValue}>
                        {entry.weight.toFixed(1)} {entry.unit ?? 'lb'}
                      </ThemedText>
                      <ThemedText style={styles(theme).chartTooltipDate}>
                        {new Date(entry.recordedAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </ThemedText>
                    </View>
                  );
                },
                pointerVanishDelay: 0,
                activatePointersOnLongPress: false,
              }}
              isAnimated
            />
          </View>
        </View>
      )}
    </Container>
  );
});

export default WeightTrendChart;

const styles = (theme: Theme) =>
  StyleSheet.create({
    graphCard: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: theme.card,
    },
    graphBody: {
      width: '100%',
      gap: 12,
    },
    graphHeader: {
      width: '100%',
      marginBottom: 0,
    },
    graphTitle: {
      fontSize: 20,
    },
    graphSubtitle: {
      color: theme.textSecondary,
      marginTop: 4,
    },
    emptyGraph: {
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
    chartRow: {
      flexDirection: 'row',
      width: '100%',
      alignItems: 'center',
      gap: 8,
    },
    yAxisColumn: {
      width: Y_AXIS_WIDTH,
      justifyContent: 'space-between',
    },
    yAxisLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    chartWrapper: {
      overflow: 'hidden',
      borderRadius: 12,
    },
    xAxisLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      minWidth: 30,
    },
    chartTooltip: {
      position: 'absolute',
      top: 8,
      width: 120,
      padding: 8,
      borderRadius: 10,
      backgroundColor: theme.cardElevated,
      borderWidth: 1,
      borderColor: theme.border,
      zIndex: 2,
    },
    chartTooltipValue: {
      fontWeight: '700',
      fontSize: 16,
    },
    chartTooltipDate: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    topContent: {
      width: '100%',
      gap: 12,
    },
  });
