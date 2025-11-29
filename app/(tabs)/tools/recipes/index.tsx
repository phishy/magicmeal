import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Theme } from '@/constants/theme';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { listFoods } from '@/services/foods';
import type { SavedFood } from '@/types';

type RecipesStyles = ReturnType<typeof createStyles>;

export default function RecipesScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [foods, setFoods] = useState<SavedFood[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [foodsError, setFoodsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadFoods = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setFoodsLoading(true);
      }
      setFoodsError(null);
      try {
        const data = await listFoods();
        setFoods(data);
      } catch (error: any) {
        setFoodsError(error?.message ?? 'Unable to load foods.');
      } finally {
        if (!options?.silent) {
          setFoodsLoading(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadFoods();
    }, [loadFoods])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFoods({ silent: true });
    setRefreshing(false);
  }, [loadFoods]);

  const filteredFoods = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return foods;
    return foods.filter((food) => {
      const haystack = `${food.description} ${food.brandName ?? ''} ${food.servingSize}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [foods, search]);

  const renderEmptyState = () => {
    if (foodsLoading) {
      return <ActivityIndicator color={theme.primary} style={styles.loader} />;
    }
    if (foodsError) {
      return (
        <View style={styles.errorBox}>
          <ThemedText style={styles.errorText}>{foodsError}</ThemedText>
          <TouchableOpacity onPress={() => loadFoods()}>
            <ThemedText style={styles.retryText}>Try again</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <ThemedText style={styles.emptyText}>
        Nothing here yet. Create a food to save your favorite recipes.
      </ThemedText>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Recipes</ThemedText>
          <ThemedText style={styles.subtitle}>
            Save custom foods that you prepare often and reuse them quickly.
          </ThemedText>
        </View>

        <View style={[styles.searchBar, { borderColor: theme.border }]}>
          <IconSymbol name="magnifyingglass" size={18} color={theme.textSecondary} />
          <TextInput
            placeholder="Search for a food"
            placeholderTextColor={theme.textTertiary}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        <FlatList
          data={filteredFoods}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FoodRow
              food={item}
              theme={theme}
              styles={styles}
              onPress={() => router.push({ pathname: '/tools/recipes/edit', params: { id: item.id } })}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 120 + insets.bottom },
            filteredFoods.length === 0 && styles.listContentCentered,
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={renderEmptyState}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      </ThemedView>

      <View style={[styles.createButtonWrapper, { bottom: 16 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.9}
          onPress={() => router.push('/tools/recipes/create')}
        >
          <ThemedText style={[styles.createButtonText, { color: theme.onPrimary }]}>Create a Food</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const FoodRow = ({
  food,
  theme,
  styles,
  onPress,
}: {
  food: SavedFood;
  theme: Theme;
  styles: RecipesStyles;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.foodRow, { backgroundColor: theme.card }]}>
        <View style={styles.foodContent}>
          <ThemedText style={styles.foodTitle}>{food.description}</ThemedText>
          {food.brandName ? (
            <ThemedText style={styles.foodSubtitle}>{food.brandName}</ThemedText>
          ) : null}
          <ThemedText style={styles.foodMeta}>
            {food.servingSize} • {food.servingsPerContainer} servings • {food.calories} cal
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 32,
      gap: 16,
    },
    header: {
      gap: 6,
    },
    subtitle: {
      color: theme.textSecondary,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: theme.text,
      fontSize: 16,
    },
    listContent: {
      paddingBottom: 0,
    },
    listContentCentered: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    separator: {
      height: 12,
    },
    foodRow: {
      borderRadius: 16,
      padding: 16,
    },
    foodContent: {
      gap: 4,
    },
    foodTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    foodSubtitle: {
      color: theme.textSecondary,
      fontSize: 14,
    },
    foodMeta: {
      color: theme.textTertiary,
      fontSize: 13,
    },
    loader: {
      paddingTop: 24,
    },
    errorBox: {
      alignItems: 'center',
      gap: 8,
    },
    errorText: {
      textAlign: 'center',
      color: theme.danger,
    },
    retryText: {
      color: theme.primary,
      fontWeight: '600',
    },
    emptyText: {
      color: theme.textSecondary,
      textAlign: 'center',
    },
    createButtonWrapper: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 24,
    },
    createButton: {
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

