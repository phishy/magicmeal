import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import ImageViewing, { ImageSource } from 'react-native-image-viewing';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';

const { width, height } = Dimensions.get('window');

export interface MediaSource {
  uri: string;
}

interface PostMediaViewerProps {
  visible: boolean;
  images: MediaSource[];
  initialIndex: number;
  onClose: () => void;
}

export const PostMediaViewer = ({ visible, images, initialIndex, onClose }: PostMediaViewerProps) => {
  if (Platform.OS === 'web') {
    return (
      <WebMediaViewer visible={visible} images={images} initialIndex={initialIndex} onClose={onClose} />
    );
  }

  const sources: ImageSource[] = images.map((image) => ({ uri: image.uri }));

  return (
    <ImageViewing
      images={sources}
      imageIndex={initialIndex}
      visible={visible}
      onRequestClose={onClose}
      enableSwipeDown
    />
  );
};

const WebMediaViewer = ({ visible, images, initialIndex, onClose }: PostMediaViewerProps) => {
  const { theme } = useAppTheme();
  const styles = createWebStyles(theme);
  const listRef = useRef<FlatList<MediaSource>>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (!visible) return;
    setCurrentIndex(initialIndex);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    });
  }, [visible, initialIndex]);

  useEffect(() => {
    if (!visible) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        goToIndex(Math.min(images.length - 1, currentIndex + 1));
      } else if (event.key === 'ArrowLeft') {
        goToIndex(Math.max(0, currentIndex - 1));
      } else if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [visible, currentIndex, images.length, onClose]);

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleMomentumEnd = (event: any) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(nextIndex);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={18} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.counterText}>
            {currentIndex + 1} / {images.length}
          </ThemedText>
        </View>
        <FlatList
          ref={listRef}
          horizontal
          pagingEnabled
          data={images}
          keyExtractor={(item, index) => `${item.uri}-${index}`}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={handleMomentumEnd}
          renderItem={({ item }) => (
            <ScrollView
              style={styles.zoomContainer}
              contentContainerStyle={styles.zoomContent}
              minimumZoomScale={1}
              maximumZoomScale={4}
              centerContent
            >
              <Image source={{ uri: item.uri }} style={styles.image} resizeMode="contain" />
            </ScrollView>
          )}
        />
      </View>
    </Modal>
  );
};

const createWebStyles = (theme: ReturnType<typeof useAppTheme>['theme']) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
    },
    topBar: {
      position: 'absolute',
      top: 32,
      left: 0,
      right: 0,
      zIndex: 10,
      paddingHorizontal: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    counterText: {
      color: '#fff',
      fontWeight: '600',
    },
    zoomContainer: {
      width,
      height,
    },
    zoomContent: {
      width,
      height,
      justifyContent: 'center',
      alignItems: 'center',
    },
    image: {
      width: width * 0.9,
      height: height * 0.9,
    },
  });

