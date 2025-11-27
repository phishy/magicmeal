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
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Polyline } from 'react-native-svg';
import { Swipeable } from 'react-native-gesture-handler';
import useSWR from 'swr';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { WeightEntry } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { createWeightEntry, fetchWeightEntries, removeWeightEntry } from '@/services/weight';

const CHART_HEIGHT = 160;
const CHART_WIDTH = Dimensions.get('window').width - 48;

export default function WeightTool() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    data: entries = [],
    mutate,
    isLoading,
  } = useSWR<WeightEntry[]>('weight-entries', () => fetchWeightEntries(100));

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

  const chartPoints = useMemo(() => {
    if (!recentEntries.length) {
      return '';
    }
    const weights = recentEntries.map((entry) => entry.weight);
    const minWeight = Math.min(...weights) - 2;
    const maxWeight = Math.max(...weights) + 2;
    const range = maxWeight - minWeight || 1;
    const stepX =
      recentEntries.length > 1 ? CHART_WIDTH / (recentEntries.length - 1) : CHART_WIDTH / 2;

    return recentEntries
      .map((entry, index) => {
        const x = recentEntries.length > 1 ? index * stepX : CHART_WIDTH / 2;
        const normalized = (entry.weight - minWeight) / range;
        const y = CHART_HEIGHT - normalized * CHART_HEIGHT;
        return `${x},${y}`;
      })
      .join(' ');
  }, [recentEntries]);

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
    } catch (error) {
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
      } catch (error) {
        Alert.alert('Error', 'Failed to delete entry.');
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
                Weight
              </ThemedText>
              <ThemedText style={styles.graphSubtitle}>
                Last {recentEntries.length || 'No'} entries
              </ThemedText>
            </View>
          </View>

          {recentEntries.length === 0 ? (
            <View style={styles.emptyGraph}>
              <ThemedText style={styles.emptyGraphText}>
                Log weights to see your trend line here.
              </ThemedText>
            </View>
          ) : (
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              <Polyline points={chartPoints} stroke={theme.primary} strokeWidth={3} fill="none" />
            </Svg>
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
        </ThemedView>

        <ThemedView style={styles.entriesCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Weight History
          </ThemedText>
          {isLoading ? (
            <View style={styles.emptyList}>
              <ThemedText style={styles.emptyListText}>Loading entries...</ThemedText>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.emptyList}>
              <ThemedText style={styles.emptyListText}>
                No weight entries yet. Start logging above.
              </ThemedText>
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
    graphHeader: {
      width: '100%',
      marginBottom: 12,
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
    entriesCard: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: theme.card,
      gap: 12,
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
  });

