import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import type { Theme } from '@/constants/theme';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import type { CalorieProgressCardProps, MacroProgressItem } from '@/types';
import { IconSymbol } from './ui/icon-symbol';

const RING_SIZE = 160;
const RING_STROKE = 14;
const MACRO_RING_SIZE = 90;
const MACRO_RING_STROKE = 10;
const CARD_PADDING = 20;

const CalorieProgressCard = memo(function CalorieProgressCard({
  goal,
  consumed,
  exercise = 0,
  macros = [],
}: CalorieProgressCardProps) {
  const { theme } = useAppTheme();
  const themedStyles = useMemo(() => styles(theme), [theme]);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);

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

  const slideCount = macros.length ? 2 : 1;
  useEffect(() => {
    setActiveSlide((prev) => Math.min(prev, slideCount - 1));
  }, [slideCount]);

  const handleCarouselLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportWidth(event.nativeEvent.layout.width);
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!viewportWidth) {
        return;
      }
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / viewportWidth);
      setActiveSlide(Math.min(Math.max(index, 0), slideCount - 1));
    },
    [viewportWidth, slideCount]
  );

  const slideWidth = viewportWidth || undefined;
  const showMacrosSlide = macros.length > 0;

  return (
    <View style={themedStyles.card}>
      <ScrollView
        onLayout={handleCarouselLayout}
        horizontal
        pagingEnabled
        scrollEnabled={slideCount > 1}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        <View style={[themedStyles.slide, { width: slideWidth }]}>
          <View style={themedStyles.header}>
            <ThemedText type="title" style={themedStyles.title}>
              Calories
            </ThemedText>
            <ThemedText style={themedStyles.subtitle}>
              Remaining = Goal - Food + Exercise
            </ThemedText>
          </View>

          <View style={themedStyles.content}>
            <View style={themedStyles.chartColumn}>
              <View style={themedStyles.chartWrapper}>
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
                <View style={themedStyles.chartLabel}>
                  <ThemedText style={themedStyles.remainingValue}>
                    {Math.abs(Math.round(remaining)).toLocaleString()}
                  </ThemedText>
                  <ThemedText style={themedStyles.remainingLabel}>{remainingLabel}</ThemedText>
                </View>
              </View>
            </View>

            <View style={themedStyles.statsColumn}>
              {stats.map((item) => (
                <View key={item.label} style={themedStyles.statRow}>
                  <View style={[themedStyles.statIcon, { backgroundColor: `${item.accent}20` }]}>
                    <IconSymbol name={item.icon as never} size={18} color={item.accent} />
                  </View>
                  <View>
                    <ThemedText style={themedStyles.statLabel}>{item.label}</ThemedText>
                    <ThemedText style={themedStyles.statValue}>
                      {Math.round(item.value).toLocaleString()}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {showMacrosSlide && (
          <View style={[themedStyles.slide, themedStyles.macrosSlide, { width: slideWidth }]}>
            <View style={themedStyles.header}>
              <ThemedText type="title" style={themedStyles.title}>
                Macros
              </ThemedText>
              <ThemedText style={themedStyles.subtitle}>Swipe to see daily macros</ThemedText>
            </View>
            <View style={themedStyles.macroItemsRow}>
              {macros.map((item) => (
                <View key={item.key} style={themedStyles.macroItem}>
                  <MacroRing item={item} theme={theme} stylesRef={themedStyles} />
                  <ThemedText style={[themedStyles.macroLabel, { color: item.color }]}>
                    {item.label}
                  </ThemedText>
                  <ThemedText style={themedStyles.macroRemaining}>
                    {Math.max(item.goal - item.consumed, 0).toFixed(0)}g left
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {slideCount > 1 && (
        <View style={themedStyles.pagination}>
          {Array.from({ length: slideCount }).map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[themedStyles.dot, index === activeSlide && themedStyles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
});

export default CalorieProgressCard;

const styles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      width: '100%',
      borderRadius: 20,
      padding: CARD_PADDING,
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
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
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
    slide: {
      width: '100%',
      gap: 16,
    },
    macrosSlide: {
      justifyContent: 'center',
    },
    macroItemsRow: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
      paddingHorizontal: 8,
    },
    macroItem: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
    },
    macroChartWrapper: {
      width: MACRO_RING_SIZE,
      height: MACRO_RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    macroChartLabel: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    macroValue: {
      fontSize: 24,
      fontWeight: '700',
    },
    macroGoal: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    macroLabel: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    macroRemaining: {
      color: theme.textSecondary,
      fontSize: 12,
    },
    pagination: {
      marginTop: 4,
      flexDirection: 'row',
      alignSelf: 'center',
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.separator,
    },
    dotActive: {
      width: 18,
      backgroundColor: theme.primary,
    },
  });

type ThemedStyles = ReturnType<typeof styles>;

interface MacroRingProps {
  item: MacroProgressItem;
  theme: Theme;
  stylesRef: ThemedStyles;
}

const MacroRing = ({ item, theme, stylesRef }: MacroRingProps) => {
  const normalizedGoal = item.goal > 0 ? item.goal : 1;
  const progress = Math.min(Math.max(item.consumed / normalizedGoal, 0), 1);
  const radius = (MACRO_RING_SIZE - MACRO_RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - progress * circumference;

  return (
    <View style={stylesRef.macroChartWrapper}>
      <Svg width={MACRO_RING_SIZE} height={MACRO_RING_SIZE}>
        <Circle
          cx={MACRO_RING_SIZE / 2}
          cy={MACRO_RING_SIZE / 2}
          r={radius}
          stroke={theme.separator}
          strokeWidth={MACRO_RING_STROKE}
          fill="transparent"
        />
        <Circle
          cx={MACRO_RING_SIZE / 2}
          cy={MACRO_RING_SIZE / 2}
          r={radius}
          stroke={item.color}
          strokeWidth={MACRO_RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          fill="transparent"
          transform={`rotate(-90 ${MACRO_RING_SIZE / 2} ${MACRO_RING_SIZE / 2})`}
        />
      </Svg>
      <View style={stylesRef.macroChartLabel}>
        <ThemedText style={stylesRef.macroValue}>{Math.round(item.consumed)}</ThemedText>
        <ThemedText style={stylesRef.macroGoal}>/{Math.round(item.goal)}g</ThemedText>
      </View>
    </View>
  );
};

