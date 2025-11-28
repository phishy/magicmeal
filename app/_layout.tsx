import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionProvider, useSession } from '@/providers/SessionProvider';
import { ThemePreferenceProvider } from '@/providers/ThemePreferenceProvider';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <ThemePreferenceProvider>
          <RootNavigation />
        </ThemePreferenceProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

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
          <Stack
            screenOptions={{
              headerBackTitleVisible: false,
              headerBackTitle: '',
              headerBackButtonDisplayMode: 'minimal',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="tools/blood-pressure" options={{ title: 'Blood Pressure' }} />
            <Stack.Screen name="tools/weight" options={{ title: 'Weight' }} />
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
