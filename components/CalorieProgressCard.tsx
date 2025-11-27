import { memo, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CalorieProgressCardProps } from '@/types';
import { IconSymbol } from './ui/icon-symbol';

const RING_SIZE = 160;
const RING_STROKE = 14;

const CalorieProgressCard = memo(function CalorieProgressCard({
  goal,
  consumed,
  exercise = 0,
  onPress,
}: CalorieProgressCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const normalizedGoal = goal > 0 ? goal : 1;
  const netCalories = Math.max(consumed - exercise, 0);
  const remaining = goal - consumed + exercise;
  const remainingLabel = remaining >= 0 ? 'Remaining' : 'Over';
  const progress = Math.min(Math.max(netCalories / normalizedGoal, 0), 1);

  const { radius, circumference, dashOffset } = useMemo(() => {
    const ringRadius = (RING_SIZE - RING_STROKE) / 2;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const offset = ringCircumference - progress * ringCircumference;
    return {
      radius: ringRadius,
      circumference: ringCircumference,
      dashOffset: offset,
    };
  }, [progress]);

  const stats = useMemo(
    () => [
      {
        label: 'Base Goal',
        value: goal,
        icon: 'flag.fill',
        accent: theme.text,
      },
      {
        label: 'Food',
        value: consumed,
        icon: 'fork.knife',
        accent: theme.primary,
      },
      {
        label: 'Exercise',
        value: exercise,
        icon: 'flame.fill',
        accent: theme.warning,
      },
    ],
    [goal, consumed, exercise, theme.primary, theme.text, theme.warning]
  );

  return (
    <TouchableOpacity
      disabled={!onPress}
      onPress={onPress}
      activeOpacity={0.9}
      style={styles(theme).card}
    >
      <View style={styles(theme).header}>
        <ThemedText type="title" style={styles(theme).title}>
          Calories
        </ThemedText>
        <ThemedText style={styles(theme).subtitle}>Remaining = Goal - Food + Exercise</ThemedText>
      </View>

      <View style={styles(theme).content}>
        <View style={styles(theme).chartColumn}>
          <View style={styles(theme).chartWrapper}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                stroke={theme.separator}
                strokeWidth={RING_STROKE}
                fill="transparent"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                stroke={theme.primary}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={dashOffset}
                fill="transparent"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <View style={styles(theme).chartLabel}>
              <ThemedText style={styles(theme).remainingValue}>
                {Math.abs(Math.round(remaining)).toLocaleString()}
              </ThemedText>
              <ThemedText style={styles(theme).remainingLabel}>{remainingLabel}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles(theme).statsColumn}>
          {stats.map((item) => (
            <View key={item.label} style={styles(theme).statRow}>
              <View style={[styles(theme).statIcon, { backgroundColor: `${item.accent}20` }]}>
                <IconSymbol name={item.icon as never} size={18} color={item.accent} />
              </View>
              <View>
                <ThemedText style={styles(theme).statLabel}>{item.label}</ThemedText>
                <ThemedText style={styles(theme).statValue}>
                  {Math.round(item.value).toLocaleString()}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default CalorieProgressCard;

const styles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    card: {
      width: '100%',
      borderRadius: 20,
      padding: 20,
      gap: 16,
      backgroundColor: theme.card,
    },
    header: {
      gap: 6,
    },
    title: {
      fontSize: 22,
    },
    subtitle: {
      color: theme.textSecondary,
    },
    content: {
      flexDirection: 'row',
      gap: 20,
      alignItems: 'center',
    },
    chartColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chartWrapper: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chartLabel: {
      position: 'absolute',
      alignItems: 'center',
    },
    remainingValue: {
      fontSize: 32,
      fontWeight: '700',
    },
    remainingLabel: {
      color: theme.textSecondary,
    },
    statsColumn: {
      flex: 1,
      gap: 16,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statLabel: {
      color: theme.textSecondary,
      fontSize: 14,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '600',
    },
  });

