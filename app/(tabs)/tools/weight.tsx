import { createOpenAI } from '@ai-sdk/openai';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { generateObject } from 'ai';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSWR from 'swr';
import { z } from 'zod';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { WeightInput } from '@/services/weight';
import {
  createWeightEntries,
  createWeightEntry,
  fetchWeightEntries,
  removeWeightEntry,
} from '@/services/weight';
import type { WeightEntry } from '@/types';

const CHART_HEIGHT = 160;
const Y_AXIS_WIDTH = 48;
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_MODEL = 'gpt-4o-mini'; // fastest low-latency OpenAI option available
const openai = OPENAI_API_KEY ? createOpenAI({ apiKey: OPENAI_API_KEY }) : null;
type DocumentResult = Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
type PickerAsset = DocumentPicker.DocumentPickerAsset;
const ParserResponseSchema = z.object({
  parser: z.string(),
  summary: z.string().optional(),
});

export default function WeightTool() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pickerAvailable, setPickerAvailable] = useState(true);
  const [chartRange, setChartRange] = useState<'1w' | '1m' | '3m' | '1y' | 'all' | 'custom'>('1m');
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [pickerConfig, setPickerConfig] = useState<{
    field: 'start' | 'end';
    value: Date;
    onChange: (event: DateTimePickerEvent, date?: Date) => void;
  } | null>(null);
  const canImport = pickerAvailable && Boolean(openai);
  const importHelperText = useMemo(() => {
    if (!pickerAvailable) {
      return 'File import is not supported on this platform.';
    }
    if (!openai) {
      return 'Set EXPO_PUBLIC_OPENAI_API_KEY to enable AI-powered imports.';
    }
    return null;
  }, [pickerAvailable]);

  useEffect(() => {
    let mounted = true;
    const checkAvailability = async () => {
      try {
        const available =
          (await ((DocumentPicker as any).isAvailableAsync?.() ?? Promise.resolve(true))) ?? true;
        if (mounted) {
          setPickerAvailable(available);
        }
      } catch {
        if (mounted) {
          setPickerAvailable(false);
        }
      }
    };
    checkAvailability();
    return () => {
      mounted = false;
    };
  }, []);

  const {
    data: entries = [],
    mutate,
    isLoading,
  } = useSWR<WeightEntry[]>('weight-entries', () => fetchWeightEntries(100));

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      ),
    [entries]
  );

  useFocusEffect(
    useCallback(() => {
      mutate();
    }, [mutate])
  );

  const chartEntries = useMemo(() => {
    if (!sortedEntries.length) return [];

    if (chartRange === 'all') {
      return [...sortedEntries].reverse();
    }

    if (chartRange === 'custom' && customRange?.start && customRange?.end) {
      const startTime = new Date(customRange.start).getTime();
      const endTime = new Date(customRange.end).getTime();
      return sortedEntries
        .filter((entry) => {
          const ts = new Date(entry.recordedAt).getTime();
          return ts >= startTime && ts <= endTime;
        })
        .reverse();
    }

    const lookbackDays = chartRange === '1w' ? 7 : chartRange === '1m' ? 30 : chartRange === '3m' ? 90 : 365;
    const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
    return sortedEntries.filter((entry) => new Date(entry.recordedAt).getTime() >= cutoff).reverse();
  }, [sortedEntries, chartRange, customRange]);

  const chartStats = useMemo(() => {
    if (!chartEntries.length) return null;
    const values = chartEntries.map((entry) => entry.weight);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max(1, (max - min) * 0.05);
    return {
      min,
      max,
      offset: min - padding,
    };
  }, [chartEntries]);

  const chartData = useMemo(() => {
    if (!chartStats) return [];
    return chartEntries.map((entry) => ({
      value: Number((entry.weight - chartStats.offset).toFixed(3)),
      entry,
    }));
  }, [chartEntries, chartStats]);

  const yAxisLabels = useMemo(() => {
    if (!chartStats) return [];
    const labelCount = 4;
    const range = chartStats.max - chartStats.min || 1;
    return Array.from({ length: labelCount }, (_, idx) => {
      const value = chartStats.max - (idx / (labelCount - 1)) * range;
      return value.toFixed(1);
    });
  }, [chartStats]);

  const xAxisLabelTexts = useMemo(() => {
    if (!chartEntries.length) return [];
    const labelCount = Math.min(6, chartEntries.length);
    const indices = new Set(
      Array.from({ length: labelCount }, (_, idx) =>
        Math.round((idx / Math.max(labelCount - 1, 1)) * (chartEntries.length - 1))
      )
    );
    return chartEntries.map((entry, idx) =>
      indices.has(idx)
        ? new Date(entry.recordedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })
        : ''
    );
  }, [chartEntries]);

  const openDatePicker = useCallback(
    (field: 'start' | 'end') => {
      const currentDate = new Date(customRange?.[field] ?? Date.now());

      const onChange = (_event: DateTimePickerEvent, date?: Date) => {
        if (!date) return;
        setCustomRange((prev) => {
          const next = {
            start: prev?.start ?? '',
            end: prev?.end ?? '',
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

  const [graphWidth, setGraphWidth] = useState(Dimensions.get('window').width - 40);
  const chartWidth = Math.max(160, graphWidth - Y_AXIS_WIDTH - 12);

  const weeklyGroups = useMemo(() => groupEntriesByWeek(sortedEntries), [sortedEntries]);

  const handleSaveWeight = useCallback(async () => {
    const weightNumber = Number(weight);
    if (!weightNumber) {
      Alert.alert('Missing data', 'Enter a weight value.');
      return;
    }

    setSaving(true);
    try {
      await createWeightEntry({ weight: weightNumber });
      setWeight('');
      mutate();
    } catch {
      Alert.alert('Error', 'Failed to save weight. Try again.');
    } finally {
      setSaving(false);
    }
  }, [weight, mutate]);

  const handleRemoveEntry = useCallback(
    async (id: string) => {
      try {
        await removeWeightEntry(id);
        mutate();
      } catch {
        Alert.alert('Error', 'Failed to delete entry.');
      }
    },
    [mutate]
  );

  const handleImportWeights = useCallback(async () => {
    if (!pickerAvailable) {
      Alert.alert('Import unavailable', 'This device does not support file picking.');
      return;
    }

    if (!openai) {
      Alert.alert(
        'Missing configuration',
        'Set EXPO_PUBLIC_OPENAI_API_KEY in your environment to enable importing.'
      );
      return;
    }

    let result: DocumentResult | null = null;
    try {
      result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['text/*', 'application/json', 'application/octet-stream', '*/*'],
      });
    } catch (pickerError: any) {
      console.warn('DocumentPicker error', pickerError);
      Alert.alert('Import failed', 'Unable to open file picker on this device.');
      return;
    }

    if (result.canceled || !result.assets?.length) {
      return;
    }

    setImporting(true);
    try {
      const asset = result.assets[0] as PickerAsset;
      const fileContent = await readPickedFile(asset);

      const parsedEntries = await parseWeightFileUsingAI(fileContent, openai);

      if (!parsedEntries.length) {
        Alert.alert('No entries detected', 'Could not find any weights in that file.');
        return;
      }

      await createWeightEntries(
        parsedEntries.map((entry) => ({
          weight: entry.weight,
          unit: entry.unit === 'kg' ? 'kg' : 'lb',
          recordedAt: entry.recordedAt,
        }))
      );

      Alert.alert('Imported', `Added ${parsedEntries.length} entries.`);
      mutate();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Import failed', error.message ?? 'Unable to import this file.');
    } finally {
      setImporting(false);
    }
  }, [mutate, pickerAvailable]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ThemedView
          style={styles.graphCard}
          onLayout={(event) => setGraphWidth(event.nativeEvent.layout.width)}
        >
          <View style={styles.rangeSelector}>
            {(['1w', '1m', '3m', '1y', 'all', 'custom'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.rangeTab,
                  chartRange === range && styles.rangeTabActive,
                ]}
                onPress={() => setChartRange(range)}
              >
                <ThemedText
                  style={[
                    styles.rangeTabLabel,
                    chartRange === range && styles.rangeTabLabelActive,
                  ]}
                >
                  {range === '1w'
                    ? '1W'
                    : range === '1m'
                    ? '1M'
                    : range === '3m'
                    ? '3M'
                    : range === '1y'
                    ? '1Y'
                    : range === 'all'
                    ? 'All'
                    : 'Custom'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {chartRange === 'custom' && (
            <View style={styles.customRangeRow}>
              <View style={styles.customInputContainer}>
                <ThemedText style={styles.customLabel}>Start</ThemedText>
                <TouchableOpacity
                  style={styles.customInput}
                  onPress={() => openDatePicker('start')}
                >
                  <ThemedText style={styles.customInputText}>
                    {customRange?.start
                      ? new Date(customRange.start).toLocaleDateString()
                      : 'Select date'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.customInputContainer}>
                <ThemedText style={styles.customLabel}>End</ThemedText>
                <TouchableOpacity style={styles.customInput} onPress={() => openDatePicker('end')}>
                  <ThemedText style={styles.customInputText}>
                    {customRange?.end
                      ? new Date(customRange.end).toLocaleDateString()
                      : 'Select date'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.clearCustomButton} onPress={() => setCustomRange(null)}>
                <ThemedText style={styles.clearCustomLabel}>Clear</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.graphHeader}>
            <View>
              <ThemedText type="title" style={styles.graphTitle}>
                Weight
              </ThemedText>
              <ThemedText style={styles.graphSubtitle}>
                {getRangeSubtitle(chartRange)}
              </ThemedText>
            </View>
          </View>

          {chartEntries.length === 0 ? (
            <View style={styles.emptyGraph}>
              <ThemedText style={styles.emptyGraphText}>
                Log weights to see your trend line here.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.chartRow}>
              <View style={styles.yAxisColumn}>
                {yAxisLabels.map((label, idx) => (
                  <ThemedText key={`y-${label}-${idx}`} style={styles.yAxisLabel}>
                    {label}
                  </ThemedText>
                ))}
              </View>
              <View style={[styles.chartWrapper, { width: chartWidth }]}>
                <LineChart
                  data={chartData}
                  width={chartWidth}
                  height={CHART_HEIGHT}
                  areaChart
                  adjustToWidth
                  initialSpacing={0}
                  endSpacing={0}
                  disableScroll
                  spacing={
                    chartEntries.length > 1
                      ? chartWidth / (chartEntries.length - 1)
                      : chartWidth / 2
                  }
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
                  xAxisLabelTextStyle={styles.xAxisLabel}
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
                        <View style={styles.chartTooltip}>
                          <ThemedText style={styles.chartTooltipValue}>
                            {entry.weight.toFixed(1)} {entry.unit ?? 'lb'}
                          </ThemedText>
                          <ThemedText style={styles.chartTooltipDate}>
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
        </ThemedView>

        <ThemedView style={styles.formCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Log Weight
          </ThemedText>
          <View style={styles.inputsRow}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Weight (lb)</ThemedText>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="180"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveWeight}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.saveButtonText}>Save Weight</ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.importButton}
            onPress={handleImportWeights}
            disabled={importing || !canImport}
          >
            <IconSymbol
              name="tray.and.arrow.down"
              size={18}
              color={!canImport ? theme.textTertiary : importing ? theme.textTertiary : theme.primary}
            />
            <ThemedText style={styles.importButtonText}>
              {importing ? 'Importing…' : 'Import from file'}
            </ThemedText>
          </TouchableOpacity>
          {!!importHelperText && (
            <ThemedText style={styles.importHelperText}>{importHelperText}</ThemedText>
          )}
        </ThemedView>

        <ThemedView style={styles.entriesCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Weight History
          </ThemedText>
          {isLoading ? (
            <View style={styles.emptyList}>
              <ThemedText style={styles.emptyListText}>Loading entries...</ThemedText>
            </View>
          ) : weeklyGroups.length === 0 ? (
            <View style={styles.emptyList}>
              <ThemedText style={styles.emptyListText}>
                No weight entries yet. Start logging above.
              </ThemedText>
            </View>
          ) : (
            weeklyGroups.map((group) => (
              <View key={group.key} style={styles.weekSection}>
                <View style={styles.weekHeader}>
                  <ThemedText style={styles.weekLabel}>{group.label}</ThemedText>
                  <ThemedText style={styles.weekAverage}>
                    {group.average.toFixed(1)} lbs avg
                  </ThemedText>
                </View>
                {group.entries.map((entry) => (
                  <Swipeable
                    key={entry.id}
                    renderRightActions={() => (
                      <View style={styles.swipeActions}>
                        <TouchableOpacity
                          style={[styles.swipeButton, styles.deleteButton]}
                          onPress={() => handleRemoveEntry(entry.id)}
                        >
                          <IconSymbol size={20} name="trash.fill" color="#fff" />
                          <ThemedText style={styles.swipeButtonText}>Delete</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  >
                    <View style={styles.entryItem}>
                      <View>
                        <ThemedText style={styles.entryValues}>
                          {entry.weight}
                          <ThemedText style={styles.entryUnit}> {entry.unit ?? 'lb'}</ThemedText>
                        </ThemedText>
                        <ThemedText style={styles.entrySubText}>
                          {new Date(entry.recordedAt).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.entryTimestamp}>
                        {new Date(entry.recordedAt).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </ThemedText>
                    </View>
                  </Swipeable>
                ))}
              </View>
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

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    content: { padding: 20, gap: 16, paddingBottom: 80 },
    graphCard: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: theme.card,
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
    chartRow: {
      flexDirection: 'row',
      width: '100%',
      alignItems: 'center',
      gap: 8,
    },
    yAxisColumn: {
      width: Y_AXIS_WIDTH,
      height: CHART_HEIGHT,
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
    xAxisRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 12,
      paddingHorizontal: 4,
    },
    xAxisLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      minWidth: 30,
    },
    graphHeader: {
      width: '100%',
      marginBottom: 12,
    },
    rangeSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
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
      color: '#fff',
      fontWeight: '600',
    },
    customRangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
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
      color: theme.text,
      backgroundColor: theme.cardElevated,
      fontSize: 14,
    },
    customInputText: {
      color: theme.text,
    },
    applyCustomButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: theme.primary,
      borderRadius: 10,
      alignSelf: 'flex-end',
    },
    applyCustomLabel: {
      color: '#fff',
      fontWeight: '600',
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
    graphTitle: {
      fontSize: 24,
    },
    graphSubtitle: {
      color: theme.textSecondary,
      marginTop: 4,
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
    emptyGraphText: {
      textAlign: 'center',
      color: theme.textSecondary,
    },
    formCard: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: theme.card,
      gap: 16,
    },
    sectionTitle: {
      marginBottom: 8,
    },
    inputsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    inputGroup: {
      flex: 1,
    },
    inputLabel: {
      marginBottom: 6,
      color: theme.textSecondary,
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.cardElevated,
    },
    saveButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    importButton: {
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 12,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    importButtonText: {
      color: theme.primary,
      fontWeight: '600',
    },
    importHelperText: {
      marginTop: -4,
      color: theme.textSecondary,
      fontSize: 13,
    },
    entriesCard: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: theme.card,
      gap: 12,
    },
    weekSection: {
      marginBottom: 16,
    },
    weekHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      backgroundColor: theme.cardElevated,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    weekLabel: {
      fontSize: 16,
      fontWeight: '700',
    },
    weekAverage: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    emptyList: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    emptyListText: {
      color: theme.textSecondary,
    },
    entryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.separator,
    },
    entryValues: {
      fontSize: 18,
      fontWeight: '600',
    },
    entrySubText: {
      color: theme.textTertiary,
      fontSize: 12,
    },
    entryUnit: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    entryTimestamp: {
      color: theme.textTertiary,
      fontSize: 12,
      textAlign: 'right',
    },
    swipeActions: {
      flexDirection: 'row',
      alignItems: 'center',
      height: '100%',
    },
    swipeButton: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 90,
      height: '100%',
      borderRadius: 12,
      gap: 4,
    },
    deleteButton: {
      backgroundColor: theme.danger,
    },
    swipeButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    iosPicker: {
      backgroundColor: theme.card,
    },
  });

async function parseWeightFileUsingAI(
  fileContent: string,
  aiClient: ReturnType<typeof createOpenAI>
) {
  const sample = fileContent.split(/\r?\n/).slice(0, 5).join('\n');
  const parserSpec = await requestParserFromSample(sample, aiClient);
  const rawEntries = runGeneratedParser(parserSpec.parser, fileContent);

  if (!Array.isArray(rawEntries)) {
    throw new Error('Generated parser must return an array of entries.');
  }

  return rawEntries
    .map((entry) => normalizeParsedEntry(entry))
    .filter((entry): entry is WeightInput => Boolean(entry));
}

async function requestParserFromSample(sample: string, aiClient: ReturnType<typeof createOpenAI>) {
  const prompt = `
You are a senior data engineer. I will provide the first few lines of a file that contains historical body-weight entries.
You must infer the structure and return JSON with a plain JavaScript function that can parse the ENTIRE file.

Requirements:
- Respond ONLY with JSON following this schema:
{
  "parser": "function parseWeightLog(fileText) { ... }",
  "summary": "One sentence describing the detected format"
}
- The parser must:
  * Accept a single string argument \`fileText\`.
  * Return an array of objects shaped like { weight: number, unit: 'lb' | 'kg', recordedAt: string }.
  * Handle headers, blank lines, and common date formats. Convert dates to ISO 8601 strings (set time to 09:00:00 local if missing).
  * Assume "lb" when units are missing.
  * Use only vanilla JavaScript—no external libraries.
  * Never access the network or global variables.

Sample input (first ~5 lines only):
"""
${sample}
"""
`;

  const { object } = await generateObject({
    model: aiClient(OPENAI_MODEL),
    temperature: 0,
    schema: ParserResponseSchema,
    prompt,
  });

  if (!object?.parser) {
    throw new Error('AI response missing parser function.');
  }

  return object;
}

function runGeneratedParser(parserSource: string, fileContent: string) {
  if (parserSource.length > 8000) {
    throw new Error('AI parser response was unexpectedly long.');
  }

  try {
    const runner = new Function(
      'fileText',
      `
      "use strict";
      ${parserSource}
      if (typeof parseWeightLog !== 'function') {
        throw new Error('Parser must define function parseWeightLog(fileText).');
      }
      const result = parseWeightLog(fileText);
      return result;
    `
    );

    return runner(fileContent);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Failed to execute the generated parser.'
    );
  }
}

function normalizeParsedEntry(data: any): WeightInput | null {
  const weightValue =
    typeof data?.weight === 'number'
      ? data.weight
      : data?.weight
      ? Number(String(data.weight).replace(/[^\d.-]/g, ''))
      : data?.value
      ? Number(String(data.value).replace(/[^\d.-]/g, ''))
      : undefined;

  if (typeof weightValue !== 'number' || Number.isNaN(weightValue) || weightValue <= 0) {
    return null;
  }

  const unitRaw =
    data?.unit ?? data?.units ?? data?.weightUnit ?? data?.unitOfMeasure ?? data?.measurement;
  const unit = typeof unitRaw === 'string' && unitRaw.toLowerCase().includes('kg') ? 'kg' : 'lb';

  const recordedAtRaw =
    data?.recordedAt ??
    data?.date ??
    data?.timestamp ??
    data?.datetime ??
    data?.day ??
    data?.time ??
    data?.enteredAt;

  const recordedAt = normalizeDateValue(recordedAtRaw);
  if (!recordedAt) {
    return null;
  }

  return {
    weight: Number(weightValue.toFixed(1)),
    unit,
    recordedAt,
  };
}

function normalizeDateValue(value: unknown) {
  if (!value) return null;

  const coerceDate = (input: Date) => {
    const hasTime = typeof value === 'string' && /\d{1,2}:\d{2}/.test(value);
    if (!hasTime) {
      input.setHours(9, 0, 0, 0);
    }
    return input.toISOString();
  };

  if (value instanceof Date) {
    return coerceDate(new Date(value.getTime()));
  }

  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : coerceDate(fromNumber);
  }

  const text = String(value).trim();
  if (!text.length) return null;

  let candidate = text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    candidate = `${text}T09:00:00`;
  }

  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return coerceDate(date);
}

async function readPickedFile(asset: PickerAsset) {
  const canUseNativeFs =
    Platform.OS !== 'web' && typeof (FileSystem as any)?.readAsStringAsync === 'function';
  if (canUseNativeFs) {
    const encoding = (FileSystem as any).EncodingType?.UTF8 ?? 'utf8';
    return FileSystem.readAsStringAsync(asset.uri, { encoding });
  }

  const webFile = (asset as any).file;
  if (webFile?.text) {
    return webFile.text();
  }

  const response = await fetch(asset.uri);
  if (!response.ok) {
    throw new Error('Unable to load file contents.');
  }
  return response.text();
}

function groupEntriesByWeek(entries: WeightEntry[]) {
  const map = new Map<string, WeightEntry[]>();
  entries.forEach((entry) => {
    const weekStart = getWeekStart(new Date(entry.recordedAt));
    const key = weekStart.toISOString();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(entry);
  });

  const nowWeekStart = getWeekStart(new Date());
  const lastWeekStart = new Date(nowWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  return Array.from(map.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([key, groupEntries]) => {
      const weekStart = new Date(key);
      const label = formatWeekLabel(weekStart, nowWeekStart, lastWeekStart);
      const average =
        groupEntries.reduce((sum, entry) => sum + entry.weight, 0) / groupEntries.length;
      const orderedEntries = groupEntries.sort(
        (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      );

      return {
        key,
        label,
        average: Number(average.toFixed(1)),
        entries: orderedEntries,
      };
    });
}

function getWeekStart(date: Date) {
  const result = new Date(date);
  const day = result.getDay(); // 0 Sunday
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day);
  return result;
}

function formatWeekLabel(weekStart: Date, currentWeekStart: Date, lastWeekStart: Date) {
  if (weekStart.getTime() === currentWeekStart.getTime()) {
    return 'This Week';
  }
  if (weekStart.getTime() === lastWeekStart.getTime()) {
    return 'Last Week';
  }
  return formatWeekRange(weekStart);
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const monthDayFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  const dayFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric' });
  const startLabel = monthDayFormatter.format(weekStart);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const endLabel = sameMonth ? dayFormatter.format(weekEnd) : monthDayFormatter.format(weekEnd);

  return `${startLabel} – ${endLabel}`;
}

function getRangeSubtitle(range: '1w' | '1m' | '3m' | '1y' | 'all' | 'custom') {
  switch (range) {
    case '1w':
      return 'Last 7 days';
    case '1m':
      return 'Last 30 days';
    case '3m':
      return 'Last 90 days';
    case '1y':
      return 'Last 365 days';
    case 'all':
      return 'All entries';
    case 'custom':
      return 'Custom range';
    default:
      return '';
  }
}

