import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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
import type { AuthFeedback, AuthMode } from '@/types';

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
  const passwordRef = useRef<TextInput>(null);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const { session } = useSession();

  if (session) {
    return <Redirect href="/dashboard" />;
  }

  const handleSubmit = async () => {
    setFeedback(null);

    if (!email || !password) {
      setFeedback({
        tone: 'error',
        message: 'Please enter your email and password to continue.',
      });
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
        setMode('signin');
        setFeedback({
          tone: 'info',
          message: 'Almost there! We just sent a verification email—confirm it to activate your account.',
        });
      }
    } catch (error: any) {
      setFeedback({
        tone: 'error',
        message: error.message ?? 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AnimatedBackground theme={theme} />
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
              {mode === 'signin' ? 'Sign in to pick up where you left off.' : 'Create an account to start your plan.'}
            </ThemedText>
          </View>

          <View style={styles.form}>
            {feedback && (
              <View
                style={[
                  styles.feedbackContainer,
                  feedback.tone === 'error' ? styles.feedbackError : styles.feedbackInfo,
                ]}
              >
                <ThemedText
                  style={feedback.tone === 'error' ? styles.feedbackTextError : styles.feedbackTextInfo}
                >
                  {feedback.message}
                </ThemedText>
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus?.()}
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
                ref={passwordRef}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
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
                setFeedback(null);
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

type OrbPreset = {
  size: number;
  opacity: number;
  position: Partial<Record<'top' | 'bottom' | 'left' | 'right', number>>;
  drift: { x: number; y: number };
};

const ORB_PRESETS: OrbPreset[] = [
  {
    size: 320,
    opacity: 0.28,
    position: { top: -160, left: -120 },
    drift: { x: 22, y: 26 },
  },
  {
    size: 240,
    opacity: 0.22,
    position: { top: -60, right: -80 },
    drift: { x: 18, y: 20 },
  },
  {
    size: 200,
    opacity: 0.2,
    position: { bottom: 20, left: -60 },
    drift: { x: 16, y: 18 },
  },
  {
    size: 160,
    opacity: 0.18,
    position: { bottom: -40, right: -10 },
    drift: { x: 24, y: 16 },
  },
];

const AnimatedBackground = ({ theme }: { theme: Theme }) => {
  const orbAnimations = useRef(ORB_PRESETS.map(() => new Animated.Value(0))).current;
  const waveAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(0)).current;

  const orbConfigs = useMemo(
    () =>
      ORB_PRESETS.map((preset, index) => ({
        ...preset,
        color: hexToRgba(index % 2 === 0 ? theme.primary : theme.secondary, preset.opacity),
      })),
    [theme.primary, theme.secondary],
  );

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const loops = orbAnimations.map((animation, index) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1,
            duration: 7000 + index * 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 7000 + index * 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );

      timers.push(
        setTimeout(() => {
          loop.start();
        }, index * 350),
      );

      return loop;
    });

    const waveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnimation, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnimation, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    waveLoop.start();
    pulseLoop.start();

    return () => {
      loops.forEach((loop) => loop.stop());
      waveLoop.stop();
      pulseLoop.stop();
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [orbAnimations, waveAnimation, pulseAnimation]);

  const waveTranslateX = waveAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 40],
  });
  const waveTranslateY = waveAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -24],
  });
  const waveOpacity = waveAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.18, 0.35, 0.18],
  });
  const pulseOpacity = pulseAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.05, 0.12, 0.05],
  });

  return (
    <View pointerEvents="none" style={backgroundStyles.container}>
      <LinearGradient
        colors={[hexToRgba(theme.backgroundSecondary, 0.9), hexToRgba(theme.background, 1)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={backgroundStyles.backgroundGradient}
      />
      <LinearGradient
        colors={[hexToRgba(theme.primary, 0.15), hexToRgba(theme.secondary, 0.12), 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={backgroundStyles.overlayGradient}
      />

      {orbConfigs.map((orb, index) => {
        const translateX = orbAnimations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [-orb.drift.x, orb.drift.x],
        });
        const translateY = orbAnimations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [orb.drift.y, -orb.drift.y],
        });

        return (
          <Animated.View
            key={`orb-${orb.size}-${index}`}
            style={[
              backgroundStyles.orb,
              orb.position,
              {
                width: orb.size,
                height: orb.size,
                borderRadius: orb.size / 2,
                backgroundColor: orb.color,
                transform: [{ translateX }, { translateY }],
              },
            ]}
          />
        );
      })}

      <Animated.View
        style={[
          backgroundStyles.waveLayer,
          {
            backgroundColor: hexToRgba(theme.secondary, 0.18),
            opacity: waveOpacity,
            transform: [{ translateX: waveTranslateX }, { translateY: waveTranslateY }],
          },
        ]}
      />

      <Animated.View
        style={[
          backgroundStyles.pulse,
          {
            borderColor: hexToRgba(theme.primary, 0.25),
            opacity: pulseOpacity,
          },
        ]}
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background, overflow: 'hidden' },
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
    form: {
      gap: 16,
      padding: 20,
      borderRadius: 20,
      backgroundColor: hexToRgba(theme.card, 0.96),
      borderWidth: 1,
      borderColor: hexToRgba(theme.border, 0.5),
    },
    feedbackContainer: {
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
    },
    feedbackInfo: {
      backgroundColor: hexToRgba(theme.primary, 0.08),
      borderColor: hexToRgba(theme.primary, 0.3),
    },
    feedbackError: {
      backgroundColor: hexToRgba(theme.danger, 0.08),
      borderColor: hexToRgba(theme.danger, 0.3),
    },
    feedbackTextInfo: {
      color: theme.primary,
      fontSize: 14,
    },
    feedbackTextError: {
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

const backgroundStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
  },
  waveLayer: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    bottom: -220,
    left: -80,
  },
  pulse: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    borderWidth: 1.2,
    alignSelf: 'center',
    top: 120,
  },
});


