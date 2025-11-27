import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
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
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import {
    createBloodPressureEntry,
    fetchBloodPressureEntries,
    removeBloodPressureEntry,
} from '@/services/bloodPressure';
import type { BloodPressureEntry } from '@/types';

const CHART_HEIGHT = 160;
const CHART_WIDTH = Dimensions.get('window').width - 48;

export default function BloodPressureTool() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [saving, setSaving] = useState(false);

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

  const recentEntries = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
    return sorted.slice(-7);
  }, [entries]);

  const chartData = useMemo(() => {
    if (!recentEntries.length) {
      return {
        systolicPoints: '',
        diastolicPoints: '',
        systolicNodes: [] as { x: number; y: number }[],
        diastolicNodes: [] as { x: number; y: number }[],
      };
    }

    const values = recentEntries.flatMap((entry) => [entry.systolic, entry.diastolic]);
    const minValue = Math.min(50, Math.min(...values) - 10);
    const maxValue = Math.max(190, Math.max(...values) + 10);
    const range = maxValue - minValue || 1;
    const stepX =
      recentEntries.length > 1 ? CHART_WIDTH / (recentEntries.length - 1) : CHART_WIDTH / 2;

    const mapPoint = (value: number, index: number) => {
      const x = recentEntries.length > 1 ? index * stepX : CHART_WIDTH / 2;
      const normalized = (value - minValue) / range;
      const y = CHART_HEIGHT - normalized * CHART_HEIGHT;
      return { x, y };
    };

    const systolicNodes = recentEntries.map((entry, index) => mapPoint(entry.systolic, index));
    const diastolicNodes = recentEntries.map((entry, index) => mapPoint(entry.diastolic, index));

    const toPoints = (nodes: { x: number; y: number }[]) =>
      nodes.map((point) => `${point.x},${point.y}`).join(' ');

    return {
      systolicPoints: toPoints(systolicNodes),
      diastolicPoints: toPoints(diastolicNodes),
      systolicNodes,
      diastolicNodes,
    };
  }, [recentEntries]);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ThemedView style={styles.graphCard}>
          <View style={styles.graphHeader}>
            <View>
              <ThemedText type="title" style={styles.graphTitle}>
                Blood Pressure
              </ThemedText>
              <ThemedText style={styles.graphSubtitle}>
                Last {recentEntries.length || 'No'} readings
              </ThemedText>
            </View>
          </View>

          {recentEntries.length === 0 ? (
            <View style={styles.emptyGraph}>
              <ThemedText style={styles.emptyGraphText}>
                Add readings to see your trend over time.
              </ThemedText>
            </View>
          ) : (
            <>
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
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    content: { padding: 20, gap: 16, paddingBottom: 80 },
    graphCard: { padding: 20, borderRadius: 16, backgroundColor: theme.card, alignItems: 'center' },
    graphHeader: { width: '100%', marginBottom: 12 },
    graphTitle: { fontSize: 24 },
    graphSubtitle: { color: theme.textSecondary, marginTop: 4 },
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
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, width: '100%', marginTop: 16 },
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
  });

