import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Theme } from '@/constants/theme';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
const toolCards = [
  {
    id: 'blood-pressure',
    title: 'Blood Pressure',
    description: 'Log systolic, diastolic, and pulse readings with trends.',
    icon: 'heart.fill',
    accentKey: 'toolCardBloodPressure',
    route: '/tools/blood-pressure',
  },
  {
    id: 'weight',
    title: 'Weight',
    description: 'Track weight changes over time and visualize progress.',
    icon: 'scalemass',
    accentKey: 'toolCardWeight',
    route: '/tools/weight',
  },
] satisfies readonly {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  accentKey: keyof Theme;
}[];

export default function ToolsHome() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.textHeader}>
          <ThemedText type="title" style={styles.heading}>
            Tools
          </ThemedText>
          <ThemedText style={styles.subheading}>
            Quick utilities to help you stay on top of your health data.
          </ThemedText>
        </View>

        <View style={styles.cardsWrapper}>
          {toolCards.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.cardButton}
              activeOpacity={0.85}
              onPress={() => router.push(tool.route as never)}
            >
              <ThemedView style={styles.card}>
                <View style={[styles.iconWrapper, { backgroundColor: theme[tool.accentKey] }]}>
                  <IconSymbol name={tool.icon as any} size={28} color={theme.onAccent} />
                </View>
                <View style={styles.cardBody}>
                  <ThemedText style={styles.cardTitle}>{tool.title}</ThemedText>
                  <ThemedText style={styles.cardDescription}>{tool.description}</ThemedText>
                </View>
                <IconSymbol name="chevron.right" color={theme.textSecondary} size={18} />
              </ThemedView>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      gap: 16,
    },
    textHeader: {
      marginTop: 24,
      gap: 6,
    },
    heading: {},
    subheading: {
      color: theme.textSecondary,
    },
    cardsWrapper: {
      gap: 12,
      marginTop: 8,
    },
    cardButton: {
      borderRadius: 18,
      overflow: 'hidden',
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      padding: 18,
      borderRadius: 18,
      backgroundColor: theme.card,
    },
    iconWrapper: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    cardDescription: {
      color: theme.textSecondary,
      fontSize: 14,
    },
  });

