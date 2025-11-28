import DateTimePicker, {
    DateTimePickerAndroid,
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Circle, Line, Polyline, Svg } from 'react-native-svg';
import useSWR from 'swr';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Theme } from '@/constants/theme';
import { filterEntriesByRange, getTrendRangeLabel, getTrendRangeSubtitle, TREND_RANGE_PRESETS } from '@/lib/trendRange';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import {
    createBloodPressureEntry,
    fetchBloodPressureEntries,
    removeBloodPressureEntry,
} from '@/services/bloodPressure';
import type { BloodPressureEntry, DateRange, TrendRangePreset } from '@/types';

const CHART_HEIGHT = 160;
const CARD_HORIZONTAL_GUTTER = 48;
const Y_AXIS_WIDTH = 44;
const AXIS_GAP = 12;
const AVAILABLE_WIDTH = Dimensions.get('window').width - CARD_HORIZONTAL_GUTTER;
const CHART_WIDTH = Math.max(180, AVAILABLE_WIDTH - Y_AXIS_WIDTH - AXIS_GAP);
const X_AXIS_LABEL_HEIGHT = 26;
const Y_AXIS_TICKS = 4;

type ChartPoint = { x: number; y: number };
type DateRangeField = 'start' | 'end';
type PickerConfig = {
  field: DateRangeField;
  value: Date;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
};

export default function BloodPressureTool() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [saving, setSaving] = useState(false);
  const [chartRange, setChartRange] = useState<TrendRangePreset>('1m');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [pickerConfig, setPickerConfig] = useState<PickerConfig | null>(null);

  const {
    data: entries = [],
    mutate,
    isLoading,
  } = useSWR<BloodPressureEntry[]>('blood-pressure-entries', () => fetchBloodPressureEntries(100));

  useFocusEffect(
    useCallback(() => {
      mutate();
    }, [mutate])
  );

  const chartEntries = useMemo(
    () => filterEntriesByRange(entries, chartRange, customRange),
    [entries, chartRange, customRange]
  );

  const chartData = useMemo(() => {
    if (!chartEntries.length) {
      return {
        systolicPoints: '',
        diastolicPoints: '',
        systolicNodes: [] as ChartPoint[],
        diastolicNodes: [] as ChartPoint[],
        yAxisLabels: [] as number[],
        xAxisLabels: [] as { x: number; label: string }[],
      };
    }

    const values = chartEntries.flatMap((entry) => [entry.systolic, entry.diastolic]);
    const minValue = Math.min(50, Math.min(...values) - 10);
    const maxValue = Math.max(190, Math.max(...values) + 10);
    const range = maxValue - minValue || 1;
    const stepX =
      chartEntries.length > 1 ? CHART_WIDTH / (chartEntries.length - 1) : CHART_WIDTH / 2;

    const mapPoint = (value: number, index: number): ChartPoint => {
      const x = chartEntries.length > 1 ? index * stepX : CHART_WIDTH / 2;
      const normalized = (value - minValue) / range;
      const y = CHART_HEIGHT - normalized * CHART_HEIGHT;
      return { x, y };
    };

    const systolicNodes = chartEntries.map((entry, index) => mapPoint(entry.systolic, index));
    const diastolicNodes = chartEntries.map((entry, index) => mapPoint(entry.diastolic, index));

    const toPoints = (nodes: ChartPoint[]) => nodes.map((point) => `${point.x},${point.y}`).join(' ');

    const yAxisLabels = Array.from({ length: Y_AXIS_TICKS }, (_, idx) => {
      const denominator = Math.max(Y_AXIS_TICKS - 1, 1);
      const value = maxValue - (idx / denominator) * (maxValue - minValue);
      return Math.round(value);
    });

    const labelCount = Math.min(5, chartEntries.length);
    const rawIndices = Array.from({ length: labelCount }, (_, idx) =>
      Math.round((idx / Math.max(labelCount - 1, 1)) * (chartEntries.length - 1))
    );
    const uniqueIndices = Array.from(new Set(rawIndices)).sort((a, b) => a - b);
    const xAxisLabels = uniqueIndices.map((index) => ({
      x: chartEntries.length > 1 ? index * stepX : CHART_WIDTH / 2,
      label: new Date(chartEntries[index].recordedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    }));

    return {
      systolicPoints: toPoints(systolicNodes),
      diastolicPoints: toPoints(diastolicNodes),
      systolicNodes,
      diastolicNodes,
      yAxisLabels,
      xAxisLabels,
    };
  }, [chartEntries]);

  const openDatePicker = useCallback(
    (field: DateRangeField) => {
      const currentDate = new Date(customRange?.[field] ?? Date.now());

      const onChange = (_event: DateTimePickerEvent, date?: Date) => {
        if (!date) {
          return;
        }
        setCustomRange((prev) => {
          const next: DateRange = {
            start: prev?.start,
            end: prev?.end,
          };
          next[field] = date.toISOString();
          if (next.start && next.end && new Date(next.start) > new Date(next.end)) {
            Alert.alert('Custom range', 'Start date must be before end date.');
            return prev ?? null;
          }
          return next;
        });
      };

      if (Platform.OS === 'ios') {
        setPickerConfig({
          field,
          value: currentDate,
          onChange,
        });
      } else {
        DateTimePickerAndroid.open({
          mode: 'date',
          display: 'calendar',
          value: currentDate,
          onChange,
        });
      }
    },
    [customRange]
  );

  const handleSaveEntry = useCallback(async () => {
    const systolicValue = Number(systolic);
    const diastolicValue = Number(diastolic);
    const pulseValue = pulse ? Number(pulse) : undefined;

    if (!systolicValue || !diastolicValue) {
      Alert.alert('Missing data', 'Please enter both systolic and diastolic values.');
      return;
    }

    if (diastolicValue >= systolicValue) {
      Alert.alert('Check values', 'Diastolic should be lower than systolic.');
      return;
    }

    setSaving(true);
    try {
      await createBloodPressureEntry({
        systolic: systolicValue,
        diastolic: diastolicValue,
        pulse: pulseValue,
      });
      setSystolic('');
      setDiastolic('');
      setPulse('');
      mutate();
    } catch (error) {
      Alert.alert('Error', 'Failed to save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [systolic, diastolic, pulse, mutate]);

  const handleRemoveEntry = useCallback(
    async (id: string) => {
      try {
        await removeBloodPressureEntry(id);
        mutate();
      } catch (error) {
        Alert.alert('Error', 'Failed to delete entry. Please try again.');
      }
    },
    [mutate]
  );

  const readingsLabel = chartEntries.length === 1 ? 'reading' : 'readings';
  const chartSubtitle = chartEntries.length
    ? `${getTrendRangeSubtitle(chartRange)} · ${chartEntries.length} ${readingsLabel}`
    : 'No readings in this range yet';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ThemedView style={styles.graphCard}>
          <View style={styles.graphHeader}>
            <View>
              <ThemedText type="title" style={styles.graphTitle}>
                Blood Pressure
              </ThemedText>
              <ThemedText style={styles.graphSubtitle}>{chartSubtitle}</ThemedText>
            </View>
          </View>

          <View style={styles.rangeSelector}>
            {TREND_RANGE_PRESETS.map((range) => (
              <TouchableOpacity
                key={range}
                style={[styles.rangeTab, chartRange === range && styles.rangeTabActive]}
                onPress={() => setChartRange(range)}
              >
                <ThemedText
                  style={[
                    styles.rangeTabLabel,
                    chartRange === range && styles.rangeTabLabelActive,
                  ]}
                >
                  {getTrendRangeLabel(range)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {chartRange === 'custom' && (
            <View style={styles.customRangeRow}>
              <View style={styles.customInputContainer}>
                <ThemedText style={styles.customLabel}>Start</ThemedText>
                <TouchableOpacity style={styles.customInput} onPress={() => openDatePicker('start')}>
                  <ThemedText style={styles.customInputText}>
                    {customRange?.start ? new Date(customRange.start).toLocaleDateString() : 'Select date'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.customInputContainer}>
                <ThemedText style={styles.customLabel}>End</ThemedText>
                <TouchableOpacity style={styles.customInput} onPress={() => openDatePicker('end')}>
                  <ThemedText style={styles.customInputText}>
                    {customRange?.end ? new Date(customRange.end).toLocaleDateString() : 'Select date'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.clearCustomButton} onPress={() => setCustomRange(null)}>
                <ThemedText style={styles.clearCustomLabel}>Clear</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {chartEntries.length === 0 ? (
            <View style={styles.emptyGraph}>
              <ThemedText style={styles.emptyGraphText}>
                Add readings to see your trend over time.
              </ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.chartArea}>
                <View style={styles.yAxisColumn}>
                  <View style={styles.yAxisLabels}>
                    {chartData.yAxisLabels.map((label, idx) => (
                      <ThemedText key={`y-axis-${label}-${idx}`} style={styles.yAxisLabel}>
                        {label}
                      </ThemedText>
                    ))}
                  </View>
                  <ThemedText style={styles.yAxisTitle}>mmHg</ThemedText>
                </View>
                <View style={styles.chartCanvas}>
                  <View style={styles.chartCanvasInner}>
                    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                      {[0.25, 0.5, 0.75].map((ratio) => (
                        <Line
                          key={ratio}
                          x1={0}
                          x2={CHART_WIDTH}
                          y1={CHART_HEIGHT * ratio}
                          y2={CHART_HEIGHT * ratio}
                          stroke={theme.separator}
                          strokeDasharray="4 4"
                        />
                      ))}
                      <Polyline
                        points={chartData.diastolicPoints}
                        stroke={theme.secondary}
                        strokeWidth={3}
                        fill="none"
                      />
                      <Polyline
                        points={chartData.systolicPoints}
                        stroke={theme.primary}
                        strokeWidth={3}
                        fill="none"
                      />
                      {chartData.systolicNodes.map((point, index) => (
                        <Circle key={`sys-${index}`} cx={point.x} cy={point.y} r={4} fill={theme.primary} />
                      ))}
                      {chartData.diastolicNodes.map((point, index) => (
                        <Circle key={`dia-${index}`} cx={point.x} cy={point.y} r={4} fill={theme.secondary} />
                      ))}
                    </Svg>
                    <View style={styles.xAxisLabelsLayer} pointerEvents="none">
                      {chartData.xAxisLabels.map((label, idx) => (
                        <View
                          key={`x-axis-${label.label}-${idx}`}
                          style={[styles.xAxisLabelContainer, { left: label.x }]}
                        >
                          <ThemedText style={styles.xAxisLabel}>{label.label}</ThemedText>
                        </View>
                      ))}
                    </View>
                  </View>
                  <ThemedText style={styles.xAxisTitle}>Date</ThemedText>
                </View>
              </View>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
                  <ThemedText style={styles.legendLabel}>Systolic</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.secondary }]} />
                  <ThemedText style={styles.legendLabel}>Diastolic</ThemedText>
                </View>
              </View>
            </>
          )}
        </ThemedView>

        <ThemedView style={styles.formCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Log a Reading
          </ThemedText>
          <View style={styles.inputsRow}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Systolic</ThemedText>
              <TextInput
                value={systolic}
                onChangeText={setSystolic}
                placeholder="120"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Diastolic</ThemedText>
              <TextInput
                value={diastolic}
                onChangeText={setDiastolic}
                placeholder="80"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Pulse</ThemedText>
              <TextInput
                value={pulse}
                onChangeText={setPulse}
                placeholder="70"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveEntry} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <ThemedText style={styles.saveButtonText}>Save Reading</ThemedText>
            )}
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.entriesCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Entries
          </ThemedText>
          {isLoading ? (
            <View style={styles.emptyList}>
              <ThemedText style={styles.emptyListText}>Loading readings...</ThemedText>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.emptyList}>
              <ThemedText style={styles.emptyListText}>No readings yet. Start logging above.</ThemedText>
            </View>
          ) : (
            entries.map((entry) => (
              <Swipeable
                key={entry.id}
                renderRightActions={() => (
                  <View style={styles.swipeActions}>
                    <TouchableOpacity
                      style={[styles.swipeButton, styles.deleteButton]}
                      onPress={() => handleRemoveEntry(entry.id)}
                    >
                      <IconSymbol size={20} name="trash.fill" color={theme.onDanger} />
                      <ThemedText style={styles.swipeButtonText}>Delete</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              >
                <View style={styles.entryItem}>
                  <View>
                    <ThemedText style={styles.entryValues}>
                      {entry.systolic}/{entry.diastolic}{' '}
                      <ThemedText style={styles.entryUnit}>mmHg</ThemedText>
                    </ThemedText>
                    {entry.pulse ? (
                      <ThemedText style={styles.entrySubtext}>Pulse: {entry.pulse} bpm</ThemedText>
                    ) : null}
                  </View>
                  <ThemedText style={styles.entryTimestamp}>
                    {new Date(entry.recordedAt).toLocaleString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </ThemedText>
                </View>
              </Swipeable>
            ))
          )}
        </ThemedView>
      </ScrollView>
      {Platform.OS === 'ios' && pickerConfig && (
        <DateTimePicker
          mode="date"
          display="spinner"
          value={pickerConfig.value}
          onChange={(event, date) => {
            pickerConfig.onChange(event, date);
          }}
          style={styles.iosPicker}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    content: { padding: 20, gap: 16, paddingBottom: 80 },
    graphCard: { padding: 20, borderRadius: 16, backgroundColor: theme.card, gap: 12 },
    graphHeader: { width: '100%' },
    graphTitle: { fontSize: 24 },
    graphSubtitle: { color: theme.textSecondary, marginTop: 4 },
    rangeSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    rangeTab: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rangeTabActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    rangeTabLabel: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    rangeTabLabelActive: {
      color: theme.onPrimary,
      fontWeight: '600',
    },
    customRangeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      gap: 8,
    },
    customInputContainer: {
      flex: 1,
    },
    customLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    customInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.cardElevated,
    },
    customInputText: {
      color: theme.text,
      fontSize: 14,
    },
    clearCustomButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      alignSelf: 'flex-end',
    },
    clearCustomLabel: {
      color: theme.textSecondary,
      fontSize: 13,
    },
    emptyGraph: {
      height: CHART_HEIGHT,
      width: '100%',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    emptyGraphText: { textAlign: 'center', color: theme.textSecondary },
    chartArea: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      width: '100%',
      gap: AXIS_GAP,
    },
    yAxisColumn: {
      width: Y_AXIS_WIDTH,
      alignItems: 'flex-end',
    },
    yAxisLabels: {
      height: CHART_HEIGHT,
      justifyContent: 'space-between',
    },
    yAxisLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    yAxisTitle: {
      marginTop: 4,
      fontSize: 12,
      color: theme.textSecondary,
    },
    chartCanvas: {
      flex: 1,
      alignItems: 'flex-start',
      gap: 4,
    },
    chartCanvasInner: {
      width: CHART_WIDTH,
      height: CHART_HEIGHT + X_AXIS_LABEL_HEIGHT,
      position: 'relative',
    },
    xAxisLabelsLayer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: X_AXIS_LABEL_HEIGHT,
    },
    xAxisLabelContainer: {
      position: 'absolute',
      bottom: 0,
      transform: [{ translateX: -18 }],
    },
    xAxisLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      minWidth: 36,
    },
    xAxisTitle: {
      fontSize: 12,
      color: theme.textSecondary,
      alignSelf: 'flex-start',
    },
    legend: { flexDirection: 'row', justifyContent: 'flex-start', gap: 16, width: '100%', marginTop: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendLabel: { fontSize: 14, color: theme.textSecondary },
    formCard: { padding: 20, borderRadius: 16, backgroundColor: theme.card, gap: 16 },
    sectionTitle: { marginBottom: 8 },
    inputsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    inputGroup: { flex: 1, minWidth: 100 },
    inputLabel: { marginBottom: 6, color: theme.textSecondary },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.cardElevated,
    },
    saveButton: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    saveButtonText: { color: theme.onPrimary, fontSize: 16, fontWeight: '600' },
    entriesCard: { padding: 20, borderRadius: 16, backgroundColor: theme.card, gap: 12 },
    emptyList: { paddingVertical: 24, alignItems: 'center' },
    emptyListText: { color: theme.textSecondary },
    entryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.separator,
    },
    entryValues: { fontSize: 18, fontWeight: '600' },
    entryUnit: { fontSize: 14, color: theme.textSecondary },
    entrySubtext: { color: theme.textSecondary, marginTop: 2 },
    entryTimestamp: { color: theme.textTertiary, fontSize: 12, textAlign: 'right' },
    swipeActions: { flexDirection: 'row', alignItems: 'center', height: '100%' },
    swipeButton: { justifyContent: 'center', alignItems: 'center', width: 90, height: '100%', borderRadius: 12, gap: 4 },
    deleteButton: { backgroundColor: theme.danger },
    swipeButtonText: { color: theme.onDanger, fontSize: 12, fontWeight: '600' },
    iosPicker: {
      backgroundColor: theme.card,
    },
  });

