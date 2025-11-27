import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserAvatar } from '@/components/user-avatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/providers/SessionProvider';
import { signOut } from '@/services/auth';

export default function YouScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);
  const { session } = useSession();
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error: any) {
            Alert.alert('Error', error.message ?? 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">You</ThemedText>
          <ThemedText style={styles.subtitle}>Manage your account and preferences.</ThemedText>
        </View>

        <View style={styles.card}>
          <UserAvatar email={session?.user.email} size={56} />
          <View style={styles.cardText}>
            <ThemedText style={styles.cardTitle}>{session?.user.email ?? 'Unknown user'}</ThemedText>
            <ThemedText style={styles.cardDescription}>Email</ThemedText>
          </View>
        </View>

        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/tools')}>
          <IconSymbol name="wrench.and.screwdriver" size={20} color={theme.primary} />
          <ThemedText style={styles.menuButtonText}>Go to Tools</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, styles.signOutButton]} onPress={handleSignOut}>
          <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={theme.warning} />
          <ThemedText style={[styles.menuButtonText, styles.signOutButtonText]}>Sign Out</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
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
    signOutButton: {
      borderColor: theme.warning,
    },
    signOutButtonText: {
      color: theme.warning,
      fontWeight: '600',
    },
  });

