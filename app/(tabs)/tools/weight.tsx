import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSWR from 'swr';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import WeightTrendChart from '@/components/WeightTrendChart';
import type { Theme } from '@/constants/theme';
import { filterEntriesByRange, getTrendRangeLabel, getTrendRangeSubtitle, TREND_RANGE_PRESETS } from '@/lib/trendRange';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { createWeightEntries, fetchWeightEntries, removeWeightEntry } from '@/services/weight';
import { canUseWeightImport, parseWeightFile, readWeightImportFile } from '@/services/weightImport';
import type { DateRange, TrendRangePreset, WeightEntry } from '@/types';

const CHART_HEIGHT = 160;
type DocumentResult = Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
type PickerAsset = DocumentPicker.DocumentPickerAsset;

export default function WeightTool() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [importing, setImporting] = useState(false);
  const [pickerAvailable, setPickerAvailable] = useState(true);
  const [chartRange, setChartRange] = useState<TrendRangePreset>('1m');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [pickerConfig, setPickerConfig] = useState<{
    field: 'start' | 'end';
    value: Date;
    onChange: (event: DateTimePickerEvent, date?: Date) => void;
  } | null>(null);
  const importAvailable = canUseWeightImport();
  const canImport = pickerAvailable && importAvailable;
  const importHelperText = useMemo(() => {
    if (!pickerAvailable) {
      return 'File import is not supported on this platform.';
    }
    if (!importAvailable) {
      return 'Set OPENAI_API_KEY to enable AI-powered imports.';
    }
    return null;
  }, [pickerAvailable, importAvailable]);

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

  const chartEntries = useMemo(
    () => filterEntriesByRange(sortedEntries, chartRange, customRange),
    [sortedEntries, chartRange, customRange]
  );

  const netChange = useMemo(() => {
    if (chartEntries.length < 2) return 0;
    const first = chartEntries[0].weight;
    const last = chartEntries[chartEntries.length - 1].weight;
    return Number((last - first).toFixed(1));
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

  const weeklyGroups = useMemo(() => groupEntriesByWeek(sortedEntries), [sortedEntries]);

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
      const fileContent = await readWeightImportFile(asset);

      const parsedEntries = await parseWeightFile(fileContent);

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
        <ThemedView style={styles.graphCard}>
        <View style={styles.chartHeaderRow}>
            <View>
              <ThemedText style={styles.chartTitle}>Weight</ThemedText>
              <ThemedText style={styles.chartSubtitle}>{getTrendRangeSubtitle(chartRange)}</ThemedText>
            </View>
            <View style={styles.netChangePill}>
              <ThemedText style={styles.netChangeLabel}>Change</ThemedText>
              <ThemedText style={styles.netChangeValue}>{formatNetChange(netChange)}</ThemedText>
            </View>
          </View>
          <WeightTrendChart
            entries={chartEntries}
            title=""
            subtitle=""
            emptyMessage="Log weights to see your trend line here."
            height={CHART_HEIGHT}
            wrapInCard={false}
            topContent={
              <>
                <View style={styles.rangeSelector}>
                  {TREND_RANGE_PRESETS.map((range) => (
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
                        {getTrendRangeLabel(range)}
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
              </>
            }
          />
        </ThemedView>

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
                          <IconSymbol size={20} name="trash.fill" color={theme.onDanger} />
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
      {importing && (
        <View style={styles.importOverlay} pointerEvents="auto">
          <View style={styles.importOverlayContent}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={styles.importOverlayText}>Importing weights…</ThemedText>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    content: { padding: 20, gap: 16, paddingBottom: 80 },
    graphCard: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: theme.card,
    },
    chartHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    chartTitle: {
      fontSize: 20,
      fontWeight: '600',
    },
    chartSubtitle: {
      color: theme.textSecondary,
      fontSize: 13,
      marginTop: 4,
    },
    netChangePill: {
      backgroundColor: theme.cardElevated,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      alignItems: 'flex-start',
    },
    netChangeLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    netChangeValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
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
      color: theme.onPrimary,
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
      color: theme.onPrimary,
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
      color: theme.onPrimary,
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
      color: theme.onDanger,
      fontSize: 12,
      fontWeight: '600',
    },
    iosPicker: {
      backgroundColor: theme.card,
    },
    importOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
      zIndex: 10,
    },
    importOverlayContent: {
      paddingVertical: 20,
      paddingHorizontal: 24,
      borderRadius: 16,
      backgroundColor: theme.card,
      alignItems: 'center',
      gap: 12,
    },
    importOverlayText: {
      color: theme.text,
      fontWeight: '600',
    },
  });

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

function formatNetChange(delta: number) {
  if (!delta) return '0 lb';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} lb`;
}

