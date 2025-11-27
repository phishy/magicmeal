import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Theme } from '@/constants/theme';
import { useSession } from '@/providers/SessionProvider';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';

export default function TabLayout() {
  const { session, loading } = useSession();
  const [sheetVisible, setSheetVisible] = useState(false);

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar {...props} onOpenSheet={() => setSheetVisible(true)} />
        )}
        screenOptions={{
          headerShown: false,
        }}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="gauge" color={color} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
          }}
        />
        <Tabs.Screen
          name="tools"
          options={{
            title: 'Tools',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="wrench.and.screwdriver" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: 'You',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle" color={color} />,
          }}
        />
      </Tabs>
      <PlusActionSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
    </>
  );
}

type CustomTabBarProps = BottomTabBarProps & {
  onOpenSheet: () => void;
};

const CustomTabBar = ({ state, descriptors, navigation, onOpenSheet }: CustomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: theme.card,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          shadowColor: theme.shadow,
          shadowOpacity: 0.2,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 16,
          elevation: 12,
        },
        tabButton: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        },
        tabLabel: {
          fontSize: 13,
        },
        plusWrapper: {
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: theme.primary,
          paddingTop: 12,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: theme.primary,
          shadowOpacity: 0.6,
          shadowOffset: { width: 0, height: 10 },
          shadowRadius: 20,
          elevation: 16,
        },
        plusText: {
          fontSize: 32,
          color: theme.onPrimary,
          marginTop: -4,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
      }),
    [theme, insets.bottom]
  );

  const middleIndex = Math.floor(state.routes.length / 2);

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;
        const color = isFocused ? theme.tabIconActive : theme.tabIconInactive;
        const icon =
          options.tabBarIcon?.({
            focused: isFocused,
            color,
            size: 26,
          }) ?? null;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const tabButton = (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabButton}
          >
            {icon}
            <ThemedText style={[styles.tabLabel, { color }]}>{label as string}</ThemedText>
          </TouchableOpacity>
        );

        return (
          <React.Fragment key={route.key}>
            {index === middleIndex && (
              <TouchableOpacity
                onPress={onOpenSheet}
                style={styles.plusWrapper}
                accessibilityRole="button"
                accessibilityHint="Create a new entry"
              >
                <ThemedText style={styles.plusText}>+</ThemedText>
              </TouchableOpacity>
            )}
            {tabButton}
          </React.Fragment>
        );
      })}
    </View>
  );
};

type PlusSheetProps = {
  visible: boolean;
  onClose: () => void;
};

const quickActions = [
  {
    key: 'log-food',
    label: 'Log Food',
    icon: 'magnifyingglass',
    colorKey: 'quickActionLogFood',
    route: '/food-search',
  },
  {
    key: 'barcode',
    label: 'Barcode Scan',
    icon: 'barcode.viewfinder',
    colorKey: 'quickActionBarcode',
    route: '/barcode-scanner',
  },
  {
    key: 'voice',
    label: 'Voice Log',
    icon: 'mic.fill',
    colorKey: 'quickActionVoice',
  },
  {
    key: 'meal',
    label: 'Meal Scan',
    icon: 'camera.viewfinder',
    colorKey: 'quickActionMeal',
    route: '/photo-scanner',
  },
] satisfies ReadonlyArray<{
  key: string;
  label: string;
  icon: string;
  colorKey: keyof Theme;
  route?: string;
}>;

const trackerActions = [
  { key: 'water', label: 'Water', icon: 'drop.fill' },
  { key: 'weight', label: 'Weight', icon: 'scalemass.fill', route: '/(tabs)/tools/weight' },
  { key: 'exercise', label: 'Exercise', icon: 'flame.fill' },
] as const;

const PlusActionSheet = ({ visible, onClose }: PlusSheetProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const router = useRouter();

  const handleAction = (action: { route?: string; key: string }) => {
    onClose();
    if (action.route) {
      router.push(action.route as any);
    } else {
      Alert.alert('Coming soon', 'This action will be available in a future update.');
    }
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[sheetStyles.backdrop, { backgroundColor: theme.modalBackdrop }]} />
      </TouchableWithoutFeedback>
      <View style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 24, backgroundColor: theme.card }]}>
        <View style={[sheetStyles.handle, { backgroundColor: theme.sheetHandle }]} />
        <ThemedText type="title" style={sheetStyles.sheetTitle}>
          Quick Actions
        </ThemedText>
        <View style={sheetStyles.quickGrid}>
          {quickActions.map((action) => {
            const accentColor = theme[action.colorKey];
            return (
              <TouchableOpacity
                key={action.key}
                style={[sheetStyles.quickCard, { backgroundColor: `${accentColor}20` }]}
                onPress={() => handleAction(action)}
              >
                <View style={[sheetStyles.quickIcon, { backgroundColor: accentColor }]}>
                  <IconSymbol name={action.icon} size={22} color={theme.onAccent} />
                </View>
                <ThemedText style={sheetStyles.quickLabel}>{action.label}</ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={sheetStyles.trackerList}>
          {trackerActions.map((action, index) => (
            <TouchableOpacity
              key={action.key}
              style={[
                sheetStyles.trackerRow,
                { borderBottomWidth: index === trackerActions.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.separator },
              ]}
              onPress={() => handleAction(action)}
            >
              <View style={[sheetStyles.trackerIcon, { backgroundColor: theme.trackerIconBackground }]}>
                <IconSymbol name={action.icon} size={18} color={theme.primary} />
              </View>
              <ThemedText style={sheetStyles.trackerLabel}>{action.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 18,
    gap: 18,
  },
  handle: {
    alignSelf: 'center',
    width: 60,
    height: 5,
    borderRadius: 999,
    marginBottom: 6,
  },
  sheetTitle: {
    alignSelf: 'flex-start',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  quickCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  trackerList: {
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 12,
  },
  trackerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
