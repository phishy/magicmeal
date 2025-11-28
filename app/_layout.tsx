import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { sentryConfig, shouldInitSentry } from '@/constants/env';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionProvider, useSession } from '@/providers/SessionProvider';
import { ThemePreferenceProvider } from '@/providers/ThemePreferenceProvider';
import type { AppStackScreenOptions } from '@/types';
import * as Sentry from '@sentry/react-native';

if (shouldInitSentry) {
  const integrations = [
    ...(sentryConfig.enableReplay ? [Sentry.mobileReplayIntegration()] : []),
    ...(sentryConfig.enableFeedback ? [Sentry.feedbackIntegration()] : []),
  ];

  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,

    // Adds more context data to events (IP address, cookies, user, etc.)
    // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
    sendDefaultPii: sentryConfig.sendDefaultPii,

    // Enable Logs
    enableLogs: sentryConfig.enableLogs,

    // Configure Session Replay
    replaysSessionSampleRate: sentryConfig.enableReplay ? sentryConfig.replaysSessionSampleRate : 0,
    replaysOnErrorSampleRate: sentryConfig.enableReplay ? sentryConfig.replaysOnErrorSampleRate : 0,
    integrations,

    // uncomment the line below to enable Spotlight (https://spotlightjs.com)
    // spotlight: __DEV__,
  });
}

const stackScreenOptions: AppStackScreenOptions = {
  headerBackTitleVisible: false,
  headerBackTitle: '',
  headerBackButtonDisplayMode: 'minimal',
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default Sentry.wrap(function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <ThemePreferenceProvider>
          <RootNavigation />
        </ThemePreferenceProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
});

function RootNavigation() {
  const colorScheme = useColorScheme();
  const { session, loading } = useSession();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {loading ? (
        <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText>Loading...</ThemedText>
        </ThemedView>
      ) : session ? (
        <>
          <Stack screenOptions={stackScreenOptions}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="tools/blood-pressure" options={{ title: 'Blood Pressure' }} />
            <Stack.Screen name="tools/weight" options={{ title: 'Weight' }} />
            <Stack.Screen name="post/create" options={{ headerShown: false }} />
            <Stack.Screen name="goals" options={{ title: 'Goals' }} />
          </Stack>
          <StatusBar style="auto" />
        </>
      ) : (
        <>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
          </Stack>
          <StatusBar style="auto" />
        </>
      )}
    </ThemeProvider>
  );
}
