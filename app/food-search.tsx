import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Theme } from '@/constants/theme';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { createMeal, mapFoodToMealInput } from '@/services/meals';
import { searchFoodProducts } from '@/services/openFoodFacts';
import { getOpenAiApiKey, transcribeAudioFile } from '@/services/openai';
import type { FoodItem, MealType } from '@/types';

export default function FoodSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [onlyBranded, setOnlyBranded] = useState(false);
  const [mealSheetFood, setMealSheetFood] = useState<FoodItem | null>(null);
  const router = useRouter();
  const { theme } = useAppTheme();
  const openAiKey = getOpenAiApiKey();
  const PAGE_SIZE = 20;

  const searchFood = async (query: string, page = 1, append = false) => {
    if (!query.trim()) {
      setResults([]);
      setHasMore(false);
      setCurrentPage(1);
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setSearching(true);
    }

    try {
      const { items, hasMore: more } = await searchFoodProducts({
        query,
        page,
        pageSize: PAGE_SIZE,
      });

      setHasMore(more);
      setCurrentPage(page);
      setResults((prev) => (append ? [...prev, ...items] : items));
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search. Please try again.');
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setSearching(false);
      }
    }
  };

  const addFoodToLog = async (food: FoodItem, mealType: MealType) => {
    try {
      await createMeal(mapFoodToMealInput(food, mealType));
      Alert.alert('Success', 'Meal added to your log!');
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', 'Failed to save meal. Please try again.');
    }
  };

  const startRecording = async () => {
    if (!openAiKey) {
      Alert.alert('Missing configuration', 'Set EXPO_PUBLIC_OPENAI_API_KEY to use voice search.');
      return;
    }

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission required', 'Enable microphone access to use voice search.');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    try {
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error', error);
      Alert.alert('Recording error', 'Unable to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      if (uri) {
        await transcribeAudio(uri);
      }
    } catch (error) {
      console.error('Stop recording error', error);
      Alert.alert('Recording error', 'Unable to stop recording.');
    }
  };

  const transcribeAudio = async (uri: string) => {
    if (!openAiKey) return;
    setTranscribing(true);
    try {
      const text = await transcribeAudioFile({
        uri,
        name: 'voice.m4a',
        type: 'audio/m4a',
      });

      if (text) {
        setSearchQuery(text);
      } else {
        Alert.alert('No audio detected', 'Please try speaking again.');
      }
    } catch (error: any) {
      console.error('Transcription error', error);
      Alert.alert('Transcription error', error?.message ?? 'Unable to transcribe audio.');
    } finally {
      setTranscribing(false);
    }
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const loadMoreResults = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !hasMore || loadingMore || searching) return;
    const nextPage = currentPage + 1;
    searchFood(trimmed, nextPage, true);
  };

  const dynamicStyles = createStyles(theme);
  const filteredResults = useMemo(
    () => (onlyBranded ? results.filter((item) => Boolean(item.brand)) : results),
    [results, onlyBranded]
  );

  const renderFoodItem = ({ item }: { item: FoodItem }) => (
    <View style={dynamicStyles.resultCard}>
      <View style={dynamicStyles.foodInfo}>
        <View style={dynamicStyles.resultTitleRow}>
          <ThemedText style={dynamicStyles.foodName}>{item.name}</ThemedText>
          {item.verified && (
            <View style={dynamicStyles.verifiedBadge}>
              <MaterialIcons name="verified" size={12} color="#0A84FF" />
            </View>
          )}
        </View>
        <ThemedText style={dynamicStyles.foodServing}>
          {item.calories} cal, {item.serving}
          {item.brand ? `, ${item.brand}` : ''}
        </ThemedText>
      </View>
      <TouchableOpacity
        style={dynamicStyles.resultAddButton}
        onPress={() => setMealSheetFood(item)}
        accessibilityRole="button"
        accessibilityLabel={`Add ${item.name}`}
      >
        <MaterialIcons name="add" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      setHasMore(false);
      setCurrentPage(1);
      return;
    }

    const timeout = setTimeout(() => {
      searchFood(trimmed, 1, false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  return (
    <ThemedView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={dynamicStyles.closeButton}>✕</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.searchContainer}>
        <ThemedText type="title" style={dynamicStyles.title}>Search Food</ThemedText>

        <View style={dynamicStyles.searchBox}>
          <TextInput
            style={dynamicStyles.searchInput}
            placeholder="Search for food..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <TouchableOpacity
            onPress={handleMicPress}
            style={[
              dynamicStyles.micButton,
              isRecording && dynamicStyles.micButtonActive,
              (!openAiKey || transcribing) && dynamicStyles.micButtonDisabled,
            ]}
            disabled={!openAiKey || transcribing}
            accessibilityRole="button"
            accessibilityLabel="Voice search"
          >
            <MaterialIcons
              name="mic"
              size={18}
              color={isRecording ? theme.background : theme.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {(searching || transcribing) && (
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={dynamicStyles.loadingText}>
            {transcribing ? 'Transcribing...' : 'Searching...'}
          </ThemedText>
        </View>
      )}

      {!searching && !transcribing && filteredResults.length > 0 && (
        <>
          <View style={dynamicStyles.resultsHeader}>
            <ThemedText style={dynamicStyles.resultsTitle}>Search Results</ThemedText>
            <TouchableOpacity
              style={[dynamicStyles.onlyToggle, onlyBranded && dynamicStyles.onlyToggleActive]}
              onPress={() => setOnlyBranded((prev) => !prev)}
            >
              <ThemedText
                style={[dynamicStyles.onlyToggleText, onlyBranded && dynamicStyles.onlyToggleTextActive]}
              >
                Only
              </ThemedText>
            </TouchableOpacity>
          </View>
          <FlatList
            data={filteredResults}
            renderItem={renderFoodItem}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            style={dynamicStyles.resultsList}
            contentContainerStyle={dynamicStyles.resultsContent}
            keyboardShouldPersistTaps="handled"
          />
          {hasMore && (
            <TouchableOpacity
              onPress={loadMoreResults}
              disabled={loadingMore}
              style={dynamicStyles.showMoreButton}
            >
              <ThemedText style={dynamicStyles.showMoreText}>
                {loadingMore ? 'Loading more...' : 'Show more results...'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </>
      )}

      {!searching && !transcribing && searchQuery && filteredResults.length === 0 && (
        <View style={dynamicStyles.emptyState}>
          <ThemedText style={dynamicStyles.emptyText}>No results found</ThemedText>
          <ThemedText style={dynamicStyles.emptySubtext}>Try a different search term</ThemedText>
        </View>
      )}

      {!searching && !transcribing && !searchQuery && (
        <View style={dynamicStyles.emptyState}>
          <ThemedText style={dynamicStyles.emptyText}>🔍 Search for food</ThemedText>
          <ThemedText style={dynamicStyles.emptySubtext}>
            Search thousands of foods from our database
          </ThemedText>
        </View>
      )}

      <MealSelectSheet
        visible={!!mealSheetFood}
        onClose={() => setMealSheetFood(null)}
        onSelect={(meal) => {
          if (mealSheetFood) {
            addFoodToLog(mealSheetFood, meal);
            setMealSheetFood(null);
          }
        }}
      />
    </ThemedView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  closeButton: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 20,
  },
  title: {
    marginBottom: 16,
  },
  searchBox: {
    backgroundColor: theme.cardElevated,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 12,
    fontSize: 16,
    color: theme.text,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  micButtonActive: {
    backgroundColor: theme.primary,
  },
  micButtonDisabled: {
    opacity: 0.4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: theme.textSecondary,
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  onlyToggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
  },
  onlyToggleActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  onlyToggleText: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  onlyToggleTextActive: {
    color: theme.background,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  foodInfo: {
    flex: 1,
    gap: 6,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  verifiedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(10,132,255,0.15)',
  },
  foodServing: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  resultAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.textTertiary,
    textAlign: 'center',
  },
  showMoreButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  showMoreText: {
    color: theme.primary,
    fontWeight: '600',
  },
});

const mealSheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
  },
  handle: {
    width: 50,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  mealButton: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

const mealOptions: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function MealSelectSheet({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (meal: MealType) => void;
}) {
  const { theme } = useAppTheme();

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={mealSheetStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <ThemedView style={[mealSheetStyles.sheet, { backgroundColor: theme.card }]}>
        <View style={mealSheetStyles.handle} />
        <ThemedText style={mealSheetStyles.title}>Add to meal</ThemedText>
        {mealOptions.map((meal) => (
          <TouchableOpacity
            key={meal}
            style={[mealSheetStyles.mealButton, { backgroundColor: theme.cardElevated }]}
            onPress={() => onSelect(meal)}
          >
            <MaterialIcons name="restaurant" size={20} color={theme.primary} />
            <ThemedText style={mealSheetStyles.mealLabel}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</ThemedText>
          </TouchableOpacity>
        ))}
      </ThemedView>
    </Modal>
  );
}
