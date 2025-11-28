import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Theme } from '@/constants/theme';
import { useSession } from '@/providers/SessionProvider';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { reverseGeocode } from '@/services/geocoding';
import type { CreatePostMediaInput } from '@/services/posts';
import { createPost } from '@/services/posts';
import type { GeoPoint } from '@/types';

export const options = {
  headerShown: false,
};

type ComposerMedia = CreatePostMediaInput & { id: string };

const MAX_MEDIA = 6;

export default function PostCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { session } = useSession();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [body, setBody] = useState('');
  const [media, setMedia] = useState<ComposerMedia[]>([]);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [locationCoords, setLocationCoords] = useState<GeoPoint | null>(null);

  const canPost = body.trim().length > 0 || media.length > 0;
  const remainingSlots = MAX_MEDIA - media.length;
  const maxCharacters = 2000;
  const remainingCharacters = Math.max(0, maxCharacters - body.length);

  const displayName =
    (session?.user.user_metadata?.full_name as string | undefined)?.trim() ||
    session?.user.email ||
    'You';
  const avatarLabel = displayName.charAt(0).toUpperCase();

  const closeComposer = () => {
    if (saving) return;
    router.back();
  };

  const attachFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Enable photo library access to add pictures.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      exif: true,
    });

    if (!result.canceled) {
      addAssets(result.assets);
    }
  };

  const attachFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Enable camera access to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled) {
      addAssets(result.assets);
    }
  };

  const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    if (!assets.length) return;
    setMedia((current) => {
      const slots = MAX_MEDIA - current.length;
      if (slots <= 0) {
        Alert.alert('Limit reached', `You can attach up to ${MAX_MEDIA} photos per post.`);
        return current;
      }

      const next = assets.slice(0, slots).map((asset, index) => ({
        id: `${Date.now()}-${index}-${asset.uri}`,
        uri: asset.uri,
        mimeType: asset.mimeType ?? asset.type ?? undefined,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName,
      }));

      return [...current, ...next];
    });
  };

  const removeMedia = (id: string) => {
    setMedia((current) => current.filter((item) => item.id !== id));
  };

  const attachCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Enable location access to tag where you are.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: GeoPoint = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocationCoords(coords);

      const preferredLabel = await reverseGeocode(coords);
      if (preferredLabel) {
        setLocationLabel(preferredLabel);
      } else {
        const geocode = await Location.reverseGeocodeAsync(coords);
        setLocationLabel(geocode.length ? formatLocationLabel(geocode[0]!) ?? '' : '');
      }
    } catch (error) {
      console.error('Failed to attach location', error);
      Alert.alert('Unable to get location', 'Please try again in a moment.');
    } finally {
      setLocating(false);
    }
  };

  const clearLocation = () => {
    setLocationCoords(null);
    setLocationLabel('');
  };

  const handlePost = async () => {
    if (!canPost || saving) return;
    setSaving(true);
    try {
      await createPost({
        body,
        media: media.map(({ id: _id, ...rest }) => rest),
        location: locationCoords
          ? {
              name: locationLabel.trim() ? locationLabel.trim() : undefined,
              latitude: locationCoords.latitude,
              longitude: locationCoords.longitude,
            }
          : undefined,
      });
      Alert.alert('Shared', 'Your update has been posted.');
      router.back();
    } catch (error: any) {
      Alert.alert('Unable to post', error?.message ?? 'Please try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : undefined}
    >
      <ThemedView style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={closeComposer} style={styles.headerIconButton} hitSlop={10}>
            <IconSymbol name="xmark" size={18} color={theme.text} />
          </TouchableOpacity>
          <ThemedText style={styles.title}>Create post</ThemedText>
          <TouchableOpacity
            onPress={handlePost}
            disabled={!canPost || saving}
            style={[styles.postButton, (!canPost || saving) && styles.postButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <ThemedText style={styles.postButtonText}>Post</ThemedText>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: `${theme.primary}20` }]}>
              <ThemedText style={[styles.avatarLabel, { color: theme.primary }]}>{avatarLabel}</ThemedText>
            </View>
            <View style={styles.userMeta}>
              <ThemedText style={styles.userName}>{displayName}</ThemedText>
              <View style={styles.userChipsRow}>
                <View style={[styles.chip, { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}30` }]}>
                  <ThemedText style={[styles.chipText, { color: theme.primary }]}>Private</ThemedText>
                </View>
                <View style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <ThemedText style={[styles.chipText, { color: theme.textSecondary }]}>Album</ThemedText>
                </View>
              </View>
            </View>
          </View>

          <TextInput
            style={[styles.composerInput, { color: theme.text, backgroundColor: theme.card }]}
            placeholder="What's on your mind?"
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={maxCharacters}
            value={body}
            onChangeText={setBody}
          />
          <ThemedText style={[styles.remainingText, { color: theme.textSecondary }]}>
            {remainingCharacters} characters left
          </ThemedText>

          {media.length > 0 && (
            <View style={styles.mediaSection}>
              {media.map((item) => (
                <View key={item.id} style={styles.mediaItem}>
                  <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                  <TouchableOpacity
                    style={styles.removeBadge}
                    onPress={() => removeMedia(item.id)}
                    hitSlop={8}
                  >
                    <IconSymbol name="xmark" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actionList}>
            <ActionRow
              icon="photo.on.rectangle"
              label="Photo/video"
              description={`${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} left`}
              onPress={attachFromLibrary}
            />
            <ActionRow
              icon="camera.fill"
              label="Camera"
              description="Capture a new pic"
              onPress={attachFromCamera}
            />
            <ActionRow
              icon="mappin.and.ellipse"
              label={locationCoords ? 'Edit location' : 'Add location'}
              description={
                locationCoords
                  ? locationLabel.trim() || formatFallbackLabel(locationCoords)
                  : 'Share where you are'
              }
              onPress={locationCoords ? clearLocation : attachCurrentLocation}
              loading={locating}
              trailingContent={
                locationCoords ? (
                  <TouchableOpacity hitSlop={6} onPress={clearLocation}>
                    <ThemedText style={[styles.removeLocationText, { color: theme.danger }]}>Remove</ThemedText>
                  </TouchableOpacity>
                ) : undefined
              }
            />
            {locationCoords ? (
              <TextInput
                style={[styles.locationLabelInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                placeholder="Add a place name"
                placeholderTextColor={theme.textSecondary}
                value={locationLabel}
                onChangeText={setLocationLabel}
                maxLength={120}
              />
            ) : null}
          </View>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerIconButton: {
      padding: 8,
      borderRadius: 14,
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    postButton: {
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    postButtonDisabled: {
      opacity: 0.4,
    },
    postButtonText: {
      color: theme.primary,
      fontWeight: '600',
      fontSize: 15,
    },
    content: {
      paddingBottom: 48,
      gap: 18,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLabel: {
      fontSize: 18,
      fontWeight: '600',
    },
    userMeta: {
      flex: 1,
      gap: 4,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
    },
    userChipsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
    },
    composerInput: {
      minHeight: 140,
      fontSize: 18,
      fontWeight: '500',
      textAlignVertical: 'top',
      borderRadius: 18,
      padding: 16,
    },
    remainingText: {
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    mediaSection: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    mediaItem: {
      width: '30%',
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    mediaImage: {
      width: '100%',
      height: '100%',
    },
    removeBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionList: {
      gap: 8,
    },
    actionRow: {
      borderRadius: 16,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      backgroundColor: theme.card,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionTexts: {
      flex: 1,
      gap: 2,
    },
    actionLabel: {
      fontSize: 15,
      fontWeight: '600',
    },
    actionDescription: {
      fontSize: 12,
    },
    removeLocationText: {
      fontSize: 13,
      fontWeight: '600',
    },
    locationLabelInput: {
      borderRadius: 14,
      padding: 12,
      borderWidth: StyleSheet.hairlineWidth,
      marginTop: 4,
    },
  });

const ActionRow = ({
  icon,
  label,
  description,
  onPress,
  loading,
  trailingContent,
}: {
  icon: ComponentProps<typeof IconSymbol>['name'];
  label: string;
  description?: string;
  onPress: () => void | Promise<void>;
  loading?: boolean;
  trailingContent?: React.ReactNode;
}) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} disabled={loading}>
      <View style={[styles.actionIcon, { backgroundColor: `${theme.primary}1A` }]}>
        {loading ? <ActivityIndicator color={theme.primary} /> : <IconSymbol name={icon} size={18} color={theme.primary} />}
      </View>
      <View style={styles.actionTexts}>
        <ThemedText style={styles.actionLabel}>{label}</ThemedText>
        {description ? (
          <ThemedText style={[styles.actionDescription, { color: theme.textSecondary }]}>{description}</ThemedText>
        ) : null}
      </View>
      {trailingContent}
    </TouchableOpacity>
  );
};

const formatLocationLabel = (place: Location.LocationGeocodedAddress): string | null => {
  const city = place.city ?? place.subregion ?? place.region ?? place.district;
  const country = place.country ?? place.isoCountryCode;
  const street = place.street ?? place.name;
  const locality = city ?? place.subregion ?? place.region;

  const ordered = [
    place.name && locality ? `${place.name}, ${locality}` : null,
    locality && country ? `${locality}, ${country}` : null,
    street,
    place.district,
    place.postalCode,
  ].filter(Boolean);

  if (ordered.length) {
    return ordered[0]!;
  }

  return null;
};

const formatFallbackLabel = (coords: GeoPoint) =>
  `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
