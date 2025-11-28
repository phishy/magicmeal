import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PostMediaViewer } from '@/components/PostMediaViewer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Theme } from '@/constants/theme';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { fetchMyPosts } from '@/services/posts';
import type { PostWithMedia } from '@/types';

export default function FeedScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [posts, setPosts] = useState<PostWithMedia[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<{ uri: string }[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

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

  const openMediaViewer = useCallback((post: PostWithMedia, index: number) => {
    const images = post.media
      .map((media) => media.publicUrl ?? media.storagePath)
      .filter(Boolean)
      .map((uri) => ({ uri }));

    if (!images.length) return;
    setViewerImages(images);
    setViewerIndex(index);
    setViewerVisible(true);
  }, []);

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
            <ThemedText type="title">Feed</ThemedText>
            <ThemedText style={styles.subtitle}>View and manage everything you have shared.</ThemedText>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.newPostButton} onPress={handleCreatePost}>
              <IconSymbol name="plus.circle.fill" size={18} color={theme.onPrimary} />
              <ThemedText style={styles.newPostText}>New Post</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshButton} onPress={() => loadPosts()}>
              <IconSymbol name="arrow.clockwise.circle" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.postsSection}>
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
                Nothing here yet. Create a post to see it in your feed.
              </ThemedText>
            ) : (
              posts.map((post, index) => (
                <View
                  key={post.id}
                  style={[
                    styles.postCardWrapper,
                    index === 0 && styles.postCardWrapperFirst,
                    index === posts.length - 1 && styles.postCardWrapperLast,
                  ]}
                >
                  <PostCard post={post} theme={theme} onMediaPress={openMediaViewer} />
                </View>
              ))
            )}
          </View>
        </ThemedView>
      </ScrollView>

      <PostMediaViewer
        visible={viewerVisible}
        images={viewerImages}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </SafeAreaView>
  );
}

const PostCard = ({
  post,
  theme,
  onMediaPress,
}: {
  post: PostWithMedia;
  theme: Theme;
  onMediaPress: (post: PostWithMedia, index: number) => void;
}) => {
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
          {post.media.map((media, index) => (
            <TouchableOpacity
              key={media.id}
              activeOpacity={0.9}
              onPress={() => onMediaPress(post, index)}
              style={[
                stylesPostCard.mediaWrapper,
                post.media.length === 1 && stylesPostCard.mediaWrapperSingle,
              ]}
            >
              <Image
                source={{ uri: media.publicUrl ?? media.storagePath }}
                style={stylesPostCard.mediaImage}
                contentFit="cover"
              />
            </TouchableOpacity>
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
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    newPostButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 16,
    },
    newPostText: {
      color: theme.onPrimary,
      fontWeight: '600',
    },
    refreshButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    postsSection: {
      marginTop: 8,
      borderRadius: 28,
      padding: 12,
      gap: 12,
      backgroundColor: theme.background,
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
    postCardWrapper: {
      padding: 20,
      borderRadius: 20,
      backgroundColor: theme.card,
      shadowColor: theme.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    postCardWrapperFirst: {
      marginTop: 4,
    },
    postCardWrapperLast: {
      marginBottom: 4,
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
  mediaWrapper: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaWrapperSingle: {
    width: '100%',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
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


