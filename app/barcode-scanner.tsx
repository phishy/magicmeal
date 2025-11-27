import { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import type { Theme } from '@/constants/theme';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import type { MealType } from '@/types';
import { createMeal } from '@/services/meals';

export default function BarcodeScanner() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  const { theme } = useAppTheme();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    
    // Look up barcode in database (you'll integrate with Open Food Facts API or similar)
    await lookupBarcode(data);
  };

  const lookupBarcode = async (barcode: string) => {
    try {
      // For now, we'll use Open Food Facts API (free, open database)
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();
      
      if (data.status === 1 && data.product) {
        const product = data.product;
        const nutriments = product.nutriments || {};
        
        Alert.alert(
          'Product Found!',
          `${product.product_name || 'Unknown Product'}\n\nCalories: ${Math.round(nutriments.energy_value || nutriments['energy-kcal'] || 0)} kcal\nProtein: ${nutriments.proteins || 0}g\nCarbs: ${nutriments.carbohydrates || 0}g\nFat: ${nutriments.fat || 0}g`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setScanned(false),
            },
            {
              text: 'Add to Log',
              onPress: () => addToLog(product, nutriments),
            },
          ]
        );
      } else {
        Alert.alert(
          'Product Not Found',
          'This barcode is not in our database. Would you like to add it manually?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setScanned(false),
            },
            {
              text: 'Add Manually',
              onPress: () => {
                router.push('/food-search');
              },
            },
          ]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to look up barcode. Please try again.');
      setScanned(false);
    }
  };

  const addToLog = async (product: any, nutriments: any) => {
    try {
      await createMeal({
        name: product.product_name || 'Unknown Product',
        serving: product.serving_size,
        calories: Math.round(nutriments.energy_value || nutriments['energy-kcal'] || 0),
        protein: Math.round(nutriments.proteins || 0),
        carbs: Math.round(nutriments.carbohydrates || 0),
        fat: Math.round(nutriments.fat || 0),
        mealType: getCurrentMealType(),
        rawFood: { product, nutriments, source: 'barcode' },
      });

      Alert.alert('Success', 'Meal added to your log!');
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save meal. Please try again.');
      setScanned(false);
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

  if (hasPermission === null) {
    return (
      <ThemedView style={dynamicStyles.container}>
        <ThemedText>Requesting camera permission...</ThemedText>
      </ThemedView>
    );
  }

  if (hasPermission === false) {
    return (
      <ThemedView style={dynamicStyles.container}>
        <ThemedText>No access to camera. Please enable camera permissions in settings.</ThemedText>
        <TouchableOpacity style={dynamicStyles.button} onPress={() => router.back()}>
          <ThemedText style={dynamicStyles.buttonText}>Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <CameraView
        style={dynamicStyles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={dynamicStyles.overlay}>
          <ThemedView style={dynamicStyles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <ThemedText style={dynamicStyles.closeButton}>✕</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <View style={dynamicStyles.scanArea}>
            <View style={dynamicStyles.scanFrame} />
            <ThemedText style={dynamicStyles.instructionText}>
              Position barcode within the frame
            </ThemedText>
          </View>

          {scanned && (
            <TouchableOpacity
              style={dynamicStyles.rescanButton}
              onPress={() => setScanned(false)}
            >
              <ThemedText style={dynamicStyles.rescanText}>Tap to Scan Again</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  closeButton: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  instructionText: {
    marginTop: 20,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
  },
  button: {
    marginTop: 20,
    padding: 16,
    backgroundColor: theme.primary,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rescanButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
  },
  rescanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
