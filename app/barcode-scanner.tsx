import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Theme } from '@/constants/theme';
import { stashFoodLogCandidate } from '@/lib/pendingFoodLog';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { lookupProductByBarcode, mapProductToFoodLogCandidate } from '@/services/openFoodFacts';
import { Camera, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function BarcodeScanner() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const scanLockRef = useRef(false);
  const router = useRouter();
  const { theme } = useAppTheme();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const resetScanState = () => {
    scanLockRef.current = false;
    setScanned(false);
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanLockRef.current) {
      return;
    }

    scanLockRef.current = true;
    setScanned(true);

    // Look up barcode in database (you'll integrate with Open Food Facts API or similar)
    await lookupBarcode(data);
  };

  const lookupBarcode = async (barcode: string) => {
    try {
      const product = await lookupProductByBarcode(barcode);

      if (product) {
        const candidate = mapProductToFoodLogCandidate(product, 'barcode');
        if (!candidate) {
          Alert.alert('Unsupported product', 'Unable to prepare this food for logging.');
          resetScanState();
          return;
        }

        const token = stashFoodLogCandidate(candidate);
        resetScanState();
        router.push({ pathname: '/food-detail', params: { token } });
        return;
      }

      Alert.alert(
        'Product Not Found',
        'This barcode is not in our database. Would you like to add it manually?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: resetScanState,
          },
            {
              text: 'Add Manually',
              onPress: () => {
                resetScanState();
                router.push('/food-search');
              },
            },
        ]
      );
    } catch (error) {
      console.error('Barcode lookup error:', error);
      Alert.alert('Error', 'Failed to look up barcode. Please try again.');
      resetScanState();
    }
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
              onPress={resetScanState}
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
