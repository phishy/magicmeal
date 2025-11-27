import { useState } from 'react';
import type { ColorValue } from 'react-native';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Theme } from '@/constants/theme';
import { useSession } from '@/providers/SessionProvider';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { signInWithEmail, signUpWithEmail } from '@/services/auth';

const hexToRgba = (value: string, alpha = 1) => {
  if (!value) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const normalized = value.trim();
  if (normalized.startsWith('rgb') || normalized === 'transparent') {
    return normalized;
  }

  const hex = normalized.replace('#', '');
  const fullHex = hex.length === 3 ? hex.split('').map((char) => `${char}${char}`).join('') : hex;
  const numericValue = Number.parseInt(fullHex, 16);
  const red = (numericValue >> 16) & 255;
  const green = (numericValue >> 8) & 255;
  const blue = numericValue & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const { session } = useSession();
  const gradientColors: [ColorValue, ColorValue, ...ColorValue[]] = [
    theme.backgroundSecondary,
    hexToRgba(theme.primary, 0.25),
    hexToRgba(theme.secondary, 0.18),
  ];
  const accentGlows = {
    primary: hexToRgba(theme.primary, 0.25),
    secondary: hexToRgba(theme.secondary, 0.2),
  };
  const featurePills = [
    { icon: 'star-outline' as const, label: 'AI macro coach' },
    { icon: 'leaf-outline' as const, label: 'Mindful recipes' },
    { icon: 'flash-outline' as const, label: '1-tap logging' },
  ];
  const heroHighlights = [
    { label: 'Consistency score', value: '92', meta: 'Today’s magic' },
    { label: 'Meals logged', value: '1.2M+', meta: 'Community total' },
  ];

  if (session) {
    return <Redirect href="/dashboard" />;
  }

  const handleSubmit = async () => {
    setError(null);

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
        Alert.alert('Check your email', 'Confirm your account before signing in.');
      }
    } catch (error: any) {
      setError(error.message ?? 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.backgroundGradient} />
      <View pointerEvents="none" style={[styles.glow, styles.glowPrimary, { backgroundColor: accentGlows.primary }]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowSecondary, { backgroundColor: accentGlows.secondary }]} />
      <ThemedView style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.magicBadge}>
              <Ionicons name="sparkles" size={18} color={theme.onPrimary} style={styles.badgeIcon} />
              <ThemedText style={styles.badgeText}>MagicMeal Studio</ThemedText>
            </View>
            <ThemedText type="title" style={styles.title}>
              Welcome to MagicMeal
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {mode === 'signin' ? 'Sign back in to keep your streak glowing.' : 'Craft your plan with an enchanted nutrition profile.'}
            </ThemedText>
            <View style={styles.featureRow}>
              {featurePills.map((pill) => (
                <View key={pill.label} style={styles.featurePill}>
                  <Ionicons name={pill.icon} size={16} color={theme.primary} />
                  <ThemedText style={styles.featurePillText}>{pill.label}</ThemedText>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.heroHighlights}>
            {heroHighlights.map((highlight) => (
              <View key={highlight.label} style={styles.highlightCard}>
                <ThemedText style={styles.highlightLabel}>{highlight.label}</ThemedText>
                <ThemedText style={styles.highlightValue}>{highlight.value}</ThemedText>
                <ThemedText style={styles.highlightMeta}>{highlight.meta}</ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.form}>
            {error && (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.textTertiary}
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
              <ThemedText style={styles.primaryButtonText}>
                {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              disabled={loading}
            >
              <ThemedText style={styles.secondaryButtonText}>
                {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    backgroundGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    glow: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 260,
      opacity: 0.65,
      transform: [{ rotate: '25deg' }],
    },
    glowPrimary: {
      top: -80,
      right: -40,
    },
    glowSecondary: {
      bottom: -70,
      left: -20,
    },
    container: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    card: {
      borderRadius: 28,
      padding: 24,
      backgroundColor: hexToRgba(theme.card, 0.92),
      gap: 24,
      borderWidth: 1,
      borderColor: hexToRgba(theme.border, 0.6),
      shadowColor: theme.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6,
    },
    header: {
      gap: 12,
    },
    magicBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.primary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    badgeIcon: {
      marginTop: 1,
    },
    badgeText: {
      color: theme.onPrimary,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 28,
      lineHeight: 32,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 15,
    },
    featureRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    featurePill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: hexToRgba(theme.primary, 0.2),
      backgroundColor: hexToRgba(theme.primary, 0.08),
      gap: 6,
    },
    featurePillText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    heroHighlights: {
      flexDirection: 'row',
      gap: 12,
    },
    highlightCard: {
      flex: 1,
      padding: 16,
      borderRadius: 20,
      backgroundColor: hexToRgba(theme.card, 0.9),
      borderWidth: 1,
      borderColor: hexToRgba(theme.border, 0.5),
      gap: 6,
    },
    highlightLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      letterSpacing: 0.4,
    },
    highlightValue: {
      color: theme.text,
      fontSize: 24,
      fontWeight: '700',
    },
    highlightMeta: {
      color: theme.textTertiary,
      fontSize: 12,
    },
    form: {
      gap: 16,
      padding: 20,
      borderRadius: 20,
      backgroundColor: hexToRgba(theme.card, 0.96),
      borderWidth: 1,
      borderColor: hexToRgba(theme.border, 0.5),
    },
    errorContainer: {
      backgroundColor: hexToRgba(theme.danger, 0.08),
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: hexToRgba(theme.danger, 0.3),
    },
    errorText: {
      color: theme.danger,
      fontSize: 14,
    },
    inputGroup: {
      gap: 6,
    },
    label: {
      color: theme.textSecondary,
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.card,
    },
    primaryButton: {
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: theme.primary,
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButton: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    secondaryButtonText: {
      color: theme.textSecondary,
    },
  });


