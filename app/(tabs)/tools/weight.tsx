import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Polyline, Svg } from 'react-native-svg';
import useSWR from 'swr';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createWeightEntries, createWeightEntry, fetchWeightEntries, removeWeightEntry } from '@/services/weight';
import type { WeightEntry } from '@/types';

const CHART_HEIGHT = 160;
const CHART_WIDTH = Dimensions.get('window').width - 48;
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_MODEL = 'gpt-4o-mini'; // fastest low-latency OpenAI option available
const openai = OPENAI_API_KEY ? createOpenAI({ apiKey: OPENAI_API_KEY }) : null;
type DocumentResult = Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
type PickerAsset = DocumentPicker.DocumentPickerAsset;
type ParserResponse = {
  parser: string;
  summary?: string;
};

export default function WeightTool() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pickerAvailable, setPickerAvailable] = useState(true);
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
        parsedEntries.map((entry: { weight: number; unit?: string; recordedAt: string }) => ({
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
          ) : entries.length === 0 ? (
            <View style={styles.emptyList}>
              <ThemedText style={styles.emptyListText}>
                No weight entries yet. Start logging above.
              </ThemedText>
            </View>
          ) : (
            entries.map((entry: WeightEntry) => (
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
    .map((entry: any) => ({
      weight: typeof entry?.weight === 'number' ? entry.weight : Number(entry?.weight),
      unit: entry?.unit ?? entry?.units ?? entry?.weightUnit ?? 'lb',
      recordedAt: entry?.recordedAt ?? entry?.date ?? entry?.timestamp,
    }))
    .filter(
      (entry) =>
        typeof entry.recordedAt === 'string' &&
        entry.recordedAt.length > 0 &&
        typeof entry.weight === 'number' &&
        !Number.isNaN(entry.weight)
    );
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

  const { text } = await generateText({
    model: aiClient(OPENAI_MODEL),
    temperature: 0,
    prompt,
  });

  let parsed: ParserResponse;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = tryParseLooseJson(text);
    if (!parsed) {
      console.warn('AI parser raw response:', text);
      throw new Error('AI parser response was not valid JSON.');
    }
  }

  if (!parsed?.parser || typeof parsed.parser !== 'string') {
    throw new Error('AI response missing parser function.');
  }

  return parsed;
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

function tryParseLooseJson(payload: string) {
  const start = payload.indexOf('{');
  const end = payload.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const candidate = payload.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
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

