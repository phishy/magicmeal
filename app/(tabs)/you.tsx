import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
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
export default function YouScreen() {
  const { theme, themeName, setThemeName } = useAppTheme();
  const styles = createStyles(theme);
  const { session } = useSession();
  const router = useRouter();
  const [themePickerVisible, setThemePickerVisible] = useState(false);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
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

          <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/developer-settings')}>
            <IconSymbol name="wrench.and.screwdriver.fill" size={20} color={theme.secondary} />
            <View style={styles.menuButtonContent}>
              <ThemedText style={styles.menuButtonText}>Developer Settings</ThemedText>
              <ThemedText style={styles.menuButtonCaption}>Switch AI providers & tools</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuButton, styles.signOutButton]} onPress={handleSignOut}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={theme.warning} />
            <ThemedText style={[styles.menuButtonText, styles.signOutButtonText]}>Sign Out</ThemedText>
          </TouchableOpacity>
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
  });
