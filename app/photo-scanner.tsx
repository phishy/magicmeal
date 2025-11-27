import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { MealType } from '@/types';
import { createMeal } from '@/services/meals';

export default function PhotoScanner() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      analyzeImage(result.assets[0].uri);
    }
  };

  const takePicture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permission.granted === false) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      analyzeImage(result.assets[0].uri);
    }
  };

  const analyzeImage = async (imageUri: string) => {
    setAnalyzing(true);
    
    try {
      // IMPORTANT: You'll need to integrate with an AI vision API
      // Options:
      // 1. OpenAI Vision API (GPT-4 Vision) - Best accuracy, requires API key
      // 2. Google Cloud Vision API - Good for food detection
      // 3. Clarifai Food Model - Specialized for food
      // 4. Custom ML model using TensorFlow Lite
      
      // For now, I'll show a mock implementation
      // You'll replace this with actual API calls
      await mockAnalyzeFood(imageUri);
      
    } catch {
      Alert.alert('Error', 'Failed to analyze image. Please try again.');
      setAnalyzing(false);
    }
  };

  // Mock function - replace with actual AI API integration
  const mockAnalyzeFood = async (imageUri: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock response - in production, this would come from AI
    const detectedMeals = [
      {
        name: 'Grilled Chicken Breast',
        confidence: 0.92,
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      },
      {
        name: 'Brown Rice',
        confidence: 0.88,
        calories: 215,
        protein: 5,
        carbs: 45,
        fat: 1.8,
      },
      {
        name: 'Steamed Broccoli',
        confidence: 0.95,
        calories: 55,
        protein: 4,
        carbs: 11,
        fat: 0.6,
      },
    ];

    setAnalyzing(false);
    
    // Show detected items
    Alert.alert(
      'Meal Detected!',
      `Found ${detectedMeals.length} items:\n${detectedMeals.map(m => `• ${m.name}`).join('\n')}\n\nTotal: ${detectedMeals.reduce((sum, m) => sum + m.calories, 0)} cal`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setImage(null),
        },
        {
          text: 'Add to Log',
          onPress: () => addMealsToLog(detectedMeals),
        },
      ]
    );
  };

  const addMealsToLog = async (detectedMeals: any[]) => {
    try {
      await createMeal({
        name: detectedMeals.map((m) => m.name).join(', '),
        calories: Math.round(detectedMeals.reduce((sum, m) => sum + m.calories, 0)),
        protein: Math.round(detectedMeals.reduce((sum, m) => sum + m.protein, 0)),
        carbs: Math.round(detectedMeals.reduce((sum, m) => sum + m.carbs, 0)),
        fat: Math.round(detectedMeals.reduce((sum, m) => sum + m.fat, 0)),
        mealType: getCurrentMealType(),
        rawFood: { detectedMeals, source: 'photo', imageUri: image },
      });

      Alert.alert('Success', 'Meal added to your log!');
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save meal. Please try again.');
      setImage(null);
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

  return (
    <ThemedView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={dynamicStyles.closeButton}>✕</ThemedText>
        </TouchableOpacity>
      </View>

      {!image ? (
        <View style={dynamicStyles.content}>
          <ThemedText type="title" style={dynamicStyles.title}>
            Snap Your Meal
          </ThemedText>
          <ThemedText style={dynamicStyles.subtitle}>
            AI will analyze your food and log the nutrition automatically
          </ThemedText>

          <View style={dynamicStyles.buttonContainer}>
            <TouchableOpacity style={dynamicStyles.cameraButton} onPress={takePicture}>
              <IconSymbol size={48} name="camera.fill" color="#fff" />
              <ThemedText style={dynamicStyles.buttonText}>Take Photo</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={dynamicStyles.galleryButton} onPress={pickImage}>
              <IconSymbol size={48} name="photo.fill" color={theme.primary} />
              <ThemedText style={dynamicStyles.galleryButtonText}>Choose from Library</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={dynamicStyles.tipsContainer}>
            <ThemedText style={dynamicStyles.tipsTitle}>📸 Tips for best results:</ThemedText>
            <ThemedText style={dynamicStyles.tipText}>• Capture food from directly above</ThemedText>
            <ThemedText style={dynamicStyles.tipText}>• Ensure good lighting</ThemedText>
            <ThemedText style={dynamicStyles.tipText}>• Include entire plate in frame</ThemedText>
            <ThemedText style={dynamicStyles.tipText}>• Separate items for accuracy</ThemedText>
          </View>
        </View>
      ) : (
        <View style={dynamicStyles.previewContainer}>
          <Image source={{ uri: image }} style={dynamicStyles.previewImage} />
          
          {analyzing && (
            <View style={dynamicStyles.analyzingOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={dynamicStyles.analyzingText}>Analyzing your meal...</ThemedText>
              <ThemedText style={dynamicStyles.analyzingSubtext}>
                Using AI to identify foods and calculate nutrition
              </ThemedText>
            </View>
          )}

          {!analyzing && (
            <View style={dynamicStyles.retakeButtonContainer}>
              <TouchableOpacity 
                style={dynamicStyles.retakeButton}
                onPress={() => setImage(null)}
              >
                <ThemedText style={dynamicStyles.retakeButtonText}>Retake Photo</ThemedText>
              </TouchableOpacity>
            </View>
          )}
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    color: theme.textSecondary,
    marginBottom: 40,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 40,
  },
  cameraButton: {
    backgroundColor: theme.primary,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  galleryButton: {
    backgroundColor: theme.cardElevated,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  galleryButtonText: {
    color: theme.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  tipsContainer: {
    backgroundColor: theme.card,
    padding: 20,
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: theme.text,
  },
  tipText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 6,
  },
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  analyzingSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 8,
  },
  retakeButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  retakeButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
