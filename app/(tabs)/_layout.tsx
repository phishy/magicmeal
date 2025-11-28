import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs, useRouter } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
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
import { createWeightEntry } from '@/services/weight';
import type { WeightUnit } from '@/types';
import { useSWRConfig } from 'swr';

export default function TabLayout() {
  const { session, loading } = useSession();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [weightSheetVisible, setWeightSheetVisible] = useState(false);

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
            tabBarIcon: ({ color, size }) => (
              <IconSymbol size={size ?? 24} name="gauge" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ color, size }) => (
              <IconSymbol size={size ?? 24} name="calendar" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tools"
          options={{
            title: 'Tools',
            tabBarIcon: ({ color, size }) => (
              <IconSymbol size={size ?? 24} name="wrench.and.screwdriver" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: 'You',
            tabBarIcon: ({ color, size }) => (
              <IconSymbol size={size ?? 24} name="person.crop.circle" color={color} />
            ),
          }}
        />
      </Tabs>
      <PlusActionSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSelectWeight={() => setWeightSheetVisible(true)}
      />
      <WeightQuickLogSheet visible={weightSheetVisible} onClose={() => setWeightSheetVisible(false)} />
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
          gap: 2,
        },
        tabLabel: {
          fontSize: 12,
        },
        plusWrapper: {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: theme.primary,
          paddingTop: 8,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: theme.primary,
          shadowOpacity: 0.6,
          shadowOffset: { width: 0, height: 10 },
          shadowRadius: 20,
          elevation: 16,
        },
        plusText: {
          fontSize: 24,
          color: theme.onPrimary,
          marginTop: -1,
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
            size: 24,
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
  onSelectWeight?: () => void;
};

type IconName = ComponentProps<typeof IconSymbol>['name'];

const quickActions = [
  {
    key: 'post',
    label: 'Post Update',
    icon: 'square.and.pencil',
    colorKey: 'primary',
    route: '/post/create',
  },
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
] satisfies readonly {
  key: string;
  label: string;
  icon: IconName;
  colorKey: keyof Theme;
  route?: string;
}[];

const trackerActions = [
  { key: 'water', label: 'Water', icon: 'drop.fill' },
  { key: 'weight', label: 'Weight', icon: 'scalemass.fill' },
  { key: 'exercise', label: 'Exercise', icon: 'flame.fill' },
] satisfies readonly { key: string; label: string; icon: IconName; route?: string }[];

const PlusActionSheet = ({ visible, onClose, onSelectWeight }: PlusSheetProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const router = useRouter();

  const handleAction = (action: { route?: string; key: string }) => {
    if (action.key === 'weight' && onSelectWeight) {
      onClose();
      onSelectWeight();
      return;
    }

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

type WeightQuickLogSheetProps = {
  visible: boolean;
  onClose: () => void;
};

const WeightQuickLogSheet = ({ visible, onClose }: WeightQuickLogSheetProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { mutate } = useSWRConfig();
  const styles = useMemo(() => createWeightLogSheetStyles(theme, insets.bottom), [theme, insets.bottom]);
  const [weightValue, setWeightValue] = useState('');
  const [unit, setUnit] = useState<WeightUnit>('lb');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setWeightValue('');
      setUnit('lb');
      setErrorMessage(null);
      setSaving(false);
    }
  }, [visible]);

  const handleChangeWeight = useCallback(
    (value: string) => {
      if (errorMessage) {
        setErrorMessage(null);
      }
      setWeightValue(value);
    },
    [errorMessage]
  );

  const isValidWeight = useMemo(() => {
    if (!weightValue.trim()) {
      return false;
    }
    const numeric = Number.parseFloat(weightValue.replace(',', '.'));
    return Number.isFinite(numeric) && numeric > 0;
  }, [weightValue]);

  const handleSave = useCallback(async () => {
    const numeric = Number.parseFloat(weightValue.replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setErrorMessage('Enter a valid weight.');
      return;
    }

    setSaving(true);
    try {
      await createWeightEntry({
        weight: Number(numeric.toFixed(1)),
        unit,
      });

      await Promise.all([
        mutate('weight-entries', undefined, { revalidate: true }),
        mutate('dashboard-weight', undefined, { revalidate: true }),
      ]);

      setWeightValue('');
      setErrorMessage(null);
      onClose();
    } catch (error) {
      console.error('Failed to record weight', error);
      setErrorMessage('Failed to record weight. Try again.');
    } finally {
      setSaving(false);
    }
  }, [mutate, onClose, unit, weightValue]);

  const handleClose = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [onClose, saving]);

  const canSave = isValidWeight && !saving;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={[sheetStyles.backdrop, { backgroundColor: theme.modalBackdrop }]} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.avoidingView}
      >
        <View style={styles.sheet}>
          <View>
            <ThemedText type="title" style={styles.sheetTitle}>
              Log Weight
            </ThemedText>
            <ThemedText style={styles.sheetSubtitle}>Quickly capture your latest weight.</ThemedText>
          </View>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Weight</ThemedText>
            <TextInput
              style={styles.textInput}
              value={weightValue}
              onChangeText={handleChangeWeight}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="150.2"
              placeholderTextColor={theme.textTertiary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSave) {
                  handleSave();
                }
              }}
            />
          </View>
          <View style={styles.unitToggle}>
            {(['lb', 'kg'] as WeightUnit[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.unitButton,
                  option === unit && styles.unitButtonActive,
                ]}
                onPress={() => setUnit(option)}
                disabled={saving}
              >
                <ThemedText
                  style={[
                    styles.unitButtonLabel,
                    option === unit && styles.unitButtonLabelActive,
                  ]}
                >
                  {option.toUpperCase()}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedText style={styles.helperText}>
            Entries use the current time. You can edit or import detailed logs later.
          </ThemedText>
          {!!errorMessage && <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleClose}
              disabled={saving}
            >
              <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.primaryButton,
                !canSave && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <ThemedText style={styles.primaryButtonText}>
                {saving ? 'Saving…' : 'Save'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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

const createWeightLogSheetStyles = (theme: Theme, bottomInset: number) =>
  StyleSheet.create({
    avoidingView: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 24,
      paddingTop: 18,
      paddingBottom: bottomInset + 24,
      backgroundColor: theme.card,
      gap: 16,
    },
    sheetTitle: {
      marginBottom: 4,
    },
    sheetSubtitle: {
      color: theme.textSecondary,
    },
    inputGroup: {
      gap: 8,
    },
    inputLabel: {
      color: theme.textSecondary,
      fontSize: 13,
    },
    textInput: {
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      borderColor: theme.border,
      backgroundColor: theme.cardElevated,
    },
    unitToggle: {
      flexDirection: 'row',
      gap: 12,
    },
    unitButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderColor: theme.border,
      backgroundColor: theme.cardElevated,
    },
    unitButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    unitButtonLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    unitButtonLabelActive: {
      color: theme.onPrimary,
    },
    helperText: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    errorText: {
      color: theme.danger,
      fontSize: 13,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardElevated,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    primaryButton: {
      backgroundColor: theme.primary,
    },
    disabledButton: {
      opacity: 0.5,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.onPrimary,
    },
  });
