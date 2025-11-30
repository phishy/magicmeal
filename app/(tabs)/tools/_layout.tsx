import { Stack } from 'expo-router';

import { useAppTheme } from '@/providers/ThemePreferenceProvider';

export default function ToolsLayout() {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.text },
        headerTintColor: theme.primary,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Tools' }} />
      <Stack.Screen name="blood-pressure" options={{ title: 'Blood Pressure' }} />
      <Stack.Screen name="feed" options={{ title: 'Feed' }} />
      <Stack.Screen name="recipes/index" options={{ title: 'Recipes' }} />
      <Stack.Screen name="recipes/create" options={{ title: 'Create Food' }} />
      <Stack.Screen name="recipes/edit" options={{ title: 'Edit Food' }} />
      <Stack.Screen name="weight" options={{ title: 'Weight' }} />
    </Stack>
  );
}

