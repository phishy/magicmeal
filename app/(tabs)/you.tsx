import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemeCatalog, type Theme, type ThemeName } from '@/constants/theme';
import { useSession } from '@/providers/SessionProvider';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { signOut } from '@/services/auth';
import { fetchMyPosts } from '@/services/posts';
import type { PostWithMedia } from '@/types';

export default function YouScreen() {
  const { theme, themeName, setThemeName } = useAppTheme();
  const styles = createStyles(theme);
  const { session } = useSession();
  const router = useRouter();
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [posts, setPosts] = useState<PostWithMedia[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  const executeSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to sign out. Please try again.');
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        executeSignOut();
      }
      return;
    }

    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: executeSignOut,
      },
    ]);
  };

  const loadPosts = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setPostsLoading(true);
      }
      setPostsError(null);
      try {
        const data = await fetchMyPosts();
        setPosts(data);
      } catch (error: any) {
        setPostsError(error?.message ?? 'Failed to load posts.');
      } finally {
        if (!options?.silent) {
          setPostsLoading(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts({ silent: true });
    setRefreshing(false);
  }, [loadPosts]);

  const handleCreatePost = () => {
    router.push('/post/create');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="title">You</ThemedText>
            <ThemedText style={styles.subtitle}>Manage your account and preferences.</ThemedText>
          </View>

          <View style={styles.card}>
            <IconSymbol name="person.fill" size={24} color={theme.primary} />
            <View style={styles.cardText}>
              <ThemedText style={styles.cardTitle}>{session?.user.email ?? 'Unknown user'}</ThemedText>
              <ThemedText style={styles.cardDescription}>Email</ThemedText>
            </View>
          </View>

          <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/goals')}>
            <IconSymbol name="flag.fill" size={20} color={theme.secondary} />
            <View style={styles.menuButtonContent}>
              <ThemedText style={styles.menuButtonText}>Goals</ThemedText>
              <ThemedText style={styles.menuButtonCaption}>Edit weight and activity targets</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={() => setThemePickerVisible(true)}>
            <IconSymbol name="paintbrush.fill" size={20} color={theme.secondary} />
            <View style={styles.menuButtonContent}>
              <ThemedText style={styles.menuButtonText}>Theme</ThemedText>
              <ThemedText style={styles.menuButtonCaption}>
                Current: {ThemeCatalog[themeName].label}
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuButton, styles.signOutButton]} onPress={handleSignOut}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={theme.warning} />
            <ThemedText style={[styles.menuButtonText, styles.signOutButtonText]}>Sign Out</ThemedText>
          </TouchableOpacity>

          <View style={styles.postsSection}>
            <View style={styles.postsHeaderRow}>
              <ThemedText style={styles.postsTitle}>Your Posts</ThemedText>
              <TouchableOpacity onPress={handleCreatePost}>
                <ThemedText style={styles.newPostButton}>New Post</ThemedText>
              </TouchableOpacity>
            </View>

            {postsLoading ? (
              <ActivityIndicator color={theme.primary} style={styles.postsLoader} />
            ) : postsError ? (
              <View style={styles.postsErrorBox}>
                <ThemedText style={styles.postsErrorText}>{postsError}</ThemedText>
                <TouchableOpacity onPress={() => loadPosts()}>
                  <ThemedText style={styles.retryButtonText}>Try again</ThemedText>
                </TouchableOpacity>
              </View>
            ) : posts.length === 0 ? (
              <ThemedText style={styles.emptyPostsText}>
                Share something from the plus button to see it here.
              </ThemedText>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} theme={theme} />)
            )}
          </View>
        </ThemedView>
      </ScrollView>

      <Modal transparent visible={themePickerVisible} animationType="fade" onRequestClose={() => setThemePickerVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setThemePickerVisible(false)}>
          <View style={[styles.modalBackdrop, { backgroundColor: theme.modalBackdrop }]} />
        </TouchableWithoutFeedback>
        <View style={styles.themeModalContainer}>
          <ThemedView style={styles.themeModalCard}>
            <ThemedText type="title">Choose Theme</ThemedText>
            <ThemedText style={styles.themeModalSubtitle}>Switch up the accent colors across the app.</ThemedText>
            <ScrollView
              style={styles.themeList}
              contentContainerStyle={styles.themeListContent}
              showsVerticalScrollIndicator={false}
            >
              {themeOptions.map(([name, meta]) => {
                const isActive = name === themeName;
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.themeOption, isActive && styles.themeOptionActive]}
                    onPress={() => {
                      setThemeName(name as ThemeName);
                      setThemePickerVisible(false);
                    }}
                    activeOpacity={0.9}
                  >
                    <View style={styles.themeOptionHeader}>
                      <ThemedText style={styles.themeOptionTitle}>{meta.label}</ThemedText>
                      {isActive ? <IconSymbol name="checkmark.circle.fill" size={20} color={theme.primary} /> : null}
                    </View>
                    <ThemedText style={styles.themeOptionDescription}>{meta.description}</ThemedText>
                    <View style={styles.themeSwatches}>
                      {meta.preview.map((shade) => (
                        <View key={shade} style={[styles.themeSwatch, { backgroundColor: shade }]} />
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setThemePickerVisible(false)}>
              <ThemedText style={styles.closeModalText}>Close</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const themeOptions = Object.entries(ThemeCatalog) as [ThemeName, (typeof ThemeCatalog)[ThemeName]][];

const PostCard = ({ post, theme }: { post: PostWithMedia; theme: Theme }) => {
  const locationText = formatPostLocation(post);
  return (
    <View style={[stylesPostCard.card, { backgroundColor: theme.card }]}>
      <View style={stylesPostCard.headerRow}>
        <ThemedText style={[stylesPostCard.dateText, { color: theme.textSecondary }]}>
          {formatPostDate(post.createdAt)}
        </ThemedText>
        <ThemedText style={[stylesPostCard.metaText, { color: theme.textTertiary }]}>
          {post.mediaCount ? `${post.mediaCount} photo${post.mediaCount > 1 ? 's' : ''}` : 'Text only'}
        </ThemedText>
      </View>
      {locationText ? (
        <View style={stylesPostCard.locationRow}>
          <IconSymbol name="mappin.circle.fill" size={16} color={theme.primary} />
          <ThemedText style={stylesPostCard.locationText}>{locationText}</ThemedText>
        </View>
      ) : null}
      {post.body ? <ThemedText style={stylesPostCard.bodyText}>{post.body}</ThemedText> : null}
      {post.media.length ? (
        <View style={stylesPostCard.mediaGrid}>
          {post.media.map((media) => (
            <Image
              key={media.id}
              source={{ uri: media.publicUrl ?? media.storagePath }}
              style={[
                stylesPostCard.mediaImage,
                post.media.length === 1 && stylesPostCard.mediaImageSingle,
              ]}
              accessibilityIgnoresInvertColors
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const formatPostDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const formatPostLocation = (post: PostWithMedia) => {
  if (post.locationName) {
    return post.locationName;
  }
  if (post.locationLatitude !== undefined && post.locationLongitude !== undefined) {
    return `${post.locationLatitude.toFixed(4)}, ${post.locationLongitude.toFixed(4)}`;
  }
  return null;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    container: {
      flex: 1,
      padding: 20,
      gap: 20,
    },
    header: {
      gap: 6,
      marginTop: 8,
    },
    subtitle: {
      color: theme.textSecondary,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 16,
      backgroundColor: theme.card,
    },
    cardText: {
      gap: 2,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    cardDescription: {
      color: theme.textSecondary,
      fontSize: 12,
    },
    menuButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    menuButtonText: {
      fontSize: 16,
      color: theme.text,
    },
    menuButtonContent: {
      flex: 1,
      gap: 2,
    },
    menuButtonCaption: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    signOutButton: {
      borderColor: theme.warning,
    },
    signOutButtonText: {
      color: theme.warning,
      fontWeight: '600',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    themeModalContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 20,
    },
    themeModalCard: {
      borderRadius: 24,
      padding: 20,
      gap: 16,
      maxHeight: '90%',
    },
    themeModalSubtitle: {
      color: theme.textSecondary,
      marginTop: -8,
    },
    themeOption: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
      gap: 10,
    },
    themeList: {
      maxHeight: 360,
    },
    themeListContent: {
      gap: 12,
      paddingVertical: 4,
    },
    themeOptionActive: {
      borderColor: theme.primary,
    },
    themeOptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    themeOptionTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    themeOptionDescription: {
      color: theme.textSecondary,
      fontSize: 14,
    },
    themeSwatches: {
      flexDirection: 'row',
      gap: 8,
    },
    themeSwatch: {
      width: 32,
      height: 10,
      borderRadius: 999,
    },
    closeModalButton: {
      marginTop: 4,
      alignSelf: 'flex-end',
    },
    closeModalText: {
      color: theme.primary,
      fontWeight: '600',
    },
    postsSection: {
      marginTop: 8,
      borderRadius: 20,
      padding: 20,
      backgroundColor: theme.card,
      gap: 16,
    },
    postsHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    postsTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    newPostButton: {
      color: theme.primary,
      fontWeight: '600',
    },
    postsLoader: {
      marginVertical: 12,
    },
    postsErrorBox: {
      gap: 8,
    },
    postsErrorText: {
      color: theme.danger,
    },
    retryButtonText: {
      color: theme.primary,
      fontWeight: '600',
    },
    emptyPostsText: {
      color: theme.textSecondary,
    },
  });

const stylesPostCard = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  metaText: {
    fontSize: 13,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 22,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaImage: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  mediaImageSingle: {
    width: '100%',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

