import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createMeal, mapFoodToMealInput } from '@/services/meals';
import type { FoodItem, MealType } from '@/types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function FoodSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const searchFood = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);

    try {
      // Search Open Food Facts database
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&page_size=20`
      );
      const data = await response.json();

      if (data.products && data.products.length > 0) {
        const mappedResults: FoodItem[] = data.products
          .filter((p: any) => p.product_name && p.nutriments)
          .map((product: any) => ({
            id: product.code || Math.random().toString(),
            name: product.product_name,
            calories: Math.round(product.nutriments['energy-kcal_100g'] || product.nutriments.energy_value || 0),
            protein: Math.round(product.nutriments.proteins_100g || 0),
            carbs: Math.round(product.nutriments.carbohydrates_100g || 0),
            fat: Math.round(product.nutriments.fat_100g || 0),
            serving: product.serving_size || '100g',
          }));

        setResults(mappedResults);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const addFoodToLog = async (food: FoodItem) => {
    try {
      const mealType = getCurrentMealType();
      await createMeal(mapFoodToMealInput(food, mealType));
      Alert.alert('Success', 'Meal added to your log!');
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save meal. Please try again.');
    }
  };

  const getCurrentMealType = (): MealType => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 15) return 'lunch';
    if (hour < 20) return 'dinner';
    return 'snack';
  };

  const dynamicStyles = createStyles(theme);

  const renderFoodItem = ({ item }: { item: FoodItem }) => (
    <TouchableOpacity
      style={dynamicStyles.foodItem}
      onPress={() => addFoodToLog(item)}
    >
      <View style={dynamicStyles.foodInfo}>
        <ThemedText style={dynamicStyles.foodName}>{item.name}</ThemedText>
        <ThemedText style={dynamicStyles.foodServing}>{item.serving}</ThemedText>
      </View>
      <View style={dynamicStyles.foodNutrition}>
        <ThemedText style={dynamicStyles.foodCalories}>{item.calories} cal</ThemedText>
        <View style={dynamicStyles.macros}>
          <ThemedText style={dynamicStyles.macroText}>P: {item.protein}g</ThemedText>
          <ThemedText style={dynamicStyles.macroText}>C: {item.carbs}g</ThemedText>
          <ThemedText style={dynamicStyles.macroText}>F: {item.fat}g</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timeout = setTimeout(() => {
      searchFood(trimmed);
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

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
        </View>
      </View>

      {searching && (
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={dynamicStyles.loadingText}>Searching...</ThemedText>
        </View>
      )}

      {!searching && results.length > 0 && (
        <FlatList
          data={results}
          renderItem={renderFoodItem}
          keyExtractor={(item) => item.id}
          style={dynamicStyles.resultsList}
          contentContainerStyle={dynamicStyles.resultsContent}
        />
      )}

      {!searching && searchQuery && results.length === 0 && (
        <View style={dynamicStyles.emptyState}>
          <ThemedText style={dynamicStyles.emptyText}>No results found</ThemedText>
          <ThemedText style={dynamicStyles.emptySubtext}>Try a different search term</ThemedText>
        </View>
      )}

      {!searching && !searchQuery && (
        <View style={dynamicStyles.emptyState}>
          <ThemedText style={dynamicStyles.emptyText}>🔍 Search for food</ThemedText>
          <ThemedText style={dynamicStyles.emptySubtext}>
            Search thousands of foods from our database
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const createStyles = (theme: typeof Colors.light) => StyleSheet.create({
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
    padding: 4,
  },
  searchInput: {
    padding: 12,
    fontSize: 16,
    color: theme.text,
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
    padding: 20,
    paddingTop: 0,
  },
  foodItem: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.text,
  },
  foodServing: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  foodNutrition: {
    alignItems: 'flex-end',
  },
  foodCalories: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.text,
  },
  macros: {
    flexDirection: 'row',
    gap: 8,
  },
  macroText: {
    fontSize: 10,
    color: theme.textSecondary,
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
});
