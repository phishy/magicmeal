import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSWR from 'swr';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Theme } from '@/constants/theme';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { fetchProfileGoals, updateProfileGoals } from '@/services/profileGoals';
import type { ActivityLevel, ProfileGoals, WeeklyGoalType, WeightUnit } from '@/types';
import { useRouter } from 'expo-router';

type FormState = {
  startingWeight: string;
  startingWeightDate: string;
  startingWeightUnit: WeightUnit;
  goalWeight: string;
  goalWeightUnit: WeightUnit;
  weeklyGoalRate: string;
  weeklyGoalType: WeeklyGoalType;
  activityLevel: ActivityLevel;
};

const weightUnitOptions: WeightUnit[] = ['lb', 'kg'];

const weeklyGoalOptions: { value: WeeklyGoalType; label: string; helper: string }[] = [
  { value: 'lose', label: 'Lose', helper: 'Aim to lose a set amount per week.' },
  { value: 'maintain', label: 'Maintain', helper: 'Keep things steady for now.' },
  { value: 'gain', label: 'Gain', helper: 'Add mass at a steady pace.' },
];

const activityOptions: { value: ActivityLevel; label: string; helper: string }[] = [
  { value: 'not_active', label: 'Not Very Active', helper: 'Little to no exercise most days.' },
  { value: 'lightly_active', label: 'Lightly Active', helper: '1-2 light sessions per week.' },
  { value: 'moderately_active', label: 'Moderately Active', helper: '3-4 workouts or long walks.' },
  { value: 'very_active', label: 'Very Active', helper: 'Intense training 5+ days a week.' },
];

const DEFAULT_FORM: FormState = {
  startingWeight: '',
  startingWeightDate: '',
  startingWeightUnit: 'lb',
  goalWeight: '',
  goalWeightUnit: 'lb',
  weeklyGoalRate: '',
  weeklyGoalType: 'maintain',
  activityLevel: 'not_active',
};

export default function GoalsScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<ProfileGoals>('profile-goals', fetchProfileGoals);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [iosDatePickerVisible, setIosDatePickerVisible] = useState(false);
  const [iosDateValue, setIosDateValue] = useState<Date>(new Date());
  const webDateInputRef = useRef<HTMLInputElement | null>(null);
  const isWeb = Platform.OS === 'web';
  const todayIso = useMemo(() => formatDateInput(new Date()), []);

  useEffect(() => {
    if (data) {
      setFormState((prev) => ({
        ...prev,
        ...mapGoalsToForm(data),
      }));
      setDirty(false);
    }
  }, [data]);

  const handleChange = useCallback((patch: Partial<FormState>) => {
    setFormState((prev) => ({
      ...prev,
      ...patch,
    }));
    setDirty(true);
  }, []);

  const parseNumberField = useCallback((value: string, label: string) => {
    if (!value.trim()) {
      return { value: undefined, error: undefined };
    }

    const normalized = Number.parseFloat(value.replace(',', '.'));
    if (!Number.isFinite(normalized) || normalized <= 0) {
      return { value: undefined, error: `${label} must be a positive number.` };
    }

    return { value: Number(normalized.toFixed(1)), error: undefined };
  }, []);

  const parseDateField = useCallback((value: string) => {
    if (!value.trim()) {
      return { value: undefined, error: undefined };
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return { value: undefined, error: 'Starting weight date must be YYYY-MM-DD.' };
    }

    return { value: parsed.toISOString(), error: undefined };
  }, []);

  const parseDateString = useCallback((value?: string) => {
    if (!value) {
      return undefined;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed;
  }, []);

  const handleDateSelection = useCallback(
    (date: Date) => {
      handleChange({ startingWeightDate: formatDateInput(date) });
    },
    [handleChange]
  );

  const openDatePicker = useCallback(() => {
    const initial = parseDateString(formState.startingWeightDate) ?? new Date();
    if (isWeb) {
      const formatted = formatDateInput(initial);
      if (webDateInputRef.current) {
        webDateInputRef.current.value = formatted;
        if (typeof webDateInputRef.current.showPicker === 'function') {
          webDateInputRef.current.showPicker();
        } else {
          webDateInputRef.current.focus();
        }
      }
      return;
    }

    if (Platform.OS === 'android') {
      const onChange = (_event: DateTimePickerEvent, selected?: Date) => {
        if (selected) {
          handleDateSelection(selected);
        }
      };

      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        is24Hour: true,
        maximumDate: new Date(),
        onChange,
      });
      return;
    }

    setIosDateValue(initial);
    setIosDatePickerVisible(true);
  }, [formState.startingWeightDate, handleDateSelection, isWeb, parseDateString]);

  const closeIosPicker = useCallback(() => {
    setIosDatePickerVisible(false);
  }, []);

  const confirmIosPicker = useCallback(() => {
    handleDateSelection(iosDateValue);
    closeIosPicker();
  }, [closeIosPicker, handleDateSelection, iosDateValue]);

  const clearDate = useCallback(() => {
    handleChange({ startingWeightDate: '' });
  }, [handleChange]);

  const handleWebDateChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleChange({ startingWeightDate: event.target.value });
    },
    [handleChange]
  );

  const handleSave = useCallback(async () => {
    const startingWeightResult = parseNumberField(formState.startingWeight, 'Starting weight');
    if (startingWeightResult.error) {
      Alert.alert('Invalid entry', startingWeightResult.error);
      return;
    }

    const goalWeightResult = parseNumberField(formState.goalWeight, 'Goal weight');
    if (goalWeightResult.error) {
      Alert.alert('Invalid entry', goalWeightResult.error);
      return;
    }

    const dateResult = parseDateField(formState.startingWeightDate);
    if (dateResult.error) {
      Alert.alert('Invalid date', dateResult.error);
      return;
    }

    const weeklyGoalResult =
      formState.weeklyGoalType === 'maintain'
        ? { value: undefined, error: undefined }
        : parseNumberField(formState.weeklyGoalRate, 'Weekly goal');

    if (weeklyGoalResult.error) {
      Alert.alert('Invalid entry', weeklyGoalResult.error);
      return;
    }

    setSaving(true);
    try {
      const payload: ProfileGoals = {
        startingWeight: startingWeightResult.value,
        startingWeightRecordedAt: dateResult.value,
        startingWeightUnit: formState.startingWeightUnit,
        goalWeight: goalWeightResult.value,
        goalWeightUnit: formState.goalWeightUnit,
        weeklyGoalType: formState.weeklyGoalType,
        weeklyGoalRate: weeklyGoalResult.value,
        activityLevel: formState.activityLevel,
      };

      const updated = await updateProfileGoals(payload);
      mutate(updated, { revalidate: false });
      setFormState((prev) => ({
        ...prev,
        ...mapGoalsToForm(updated),
      }));
      setDirty(false);
      router.replace('/you');
    } catch (saveError: any) {
      console.error('Failed to save goals', saveError);
      Alert.alert('Save failed', saveError?.message ?? 'We could not update your goals. Try again.');
    } finally {
      setSaving(false);
    }
  }, [
    formState.activityLevel,
    formState.goalWeight,
    formState.goalWeightUnit,
    formState.startingWeight,
    formState.startingWeightDate,
    formState.startingWeightUnit,
    formState.weeklyGoalRate,
    formState.weeklyGoalType,
    mutate,
    parseDateField,
    parseNumberField,
  ]);

  const selectedWeeklyGoal = weeklyGoalOptions.find((option) => option.value === formState.weeklyGoalType);

  if (!data && isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.primary} />
          <ThemedText style={styles.loadingText}>Loading your goals…</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <ThemedText type="title">Goals</ThemedText>
          <ThemedText style={styles.subtitle}>
            Keep your weight and activity targets up to date. These settings help personalize insights across the app.
          </ThemedText>
        </View>

        {error ? (
          <ThemedView style={styles.errorCard}>
            <ThemedText style={styles.errorTitle}>Failed to load goals</ThemedText>
            <ThemedText style={styles.errorMessage}>
              {error instanceof Error ? error.message : 'Please check your connection and try again.'}
            </ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={() => mutate()}>
              <ThemedText style={styles.retryButtonText}>Try again</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : null}

        <ThemedView style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Starting Point</ThemedText>
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.inputLabel}>Starting Weight</ThemedText>
            <View style={styles.inlineField}>
              <TextInput
                style={[styles.textInput, styles.flex]}
                value={formState.startingWeight}
                onChangeText={(text) => handleChange({ startingWeight: text })}
                placeholder="293"
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholderTextColor={theme.textTertiary}
              />
              <View style={styles.unitGroup}>
                {weightUnitOptions.map((unit) => (
                  <TouchableOpacity
                    key={`start-unit-${unit}`}
                    style={[
                      styles.unitButton,
                      formState.startingWeightUnit === unit && styles.unitButtonActive,
                    ]}
                    onPress={() => handleChange({ startingWeightUnit: unit })}
                  >
                    <ThemedText
                      style={[
                        styles.unitButtonLabel,
                        formState.startingWeightUnit === unit && styles.unitButtonLabelActive,
                      ]}
                    >
                      {unit.toUpperCase()}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.inputLabel}>Date recorded</ThemedText>
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateButton} onPress={openDatePicker}>
                <ThemedText
                  style={[
                    styles.dateButtonLabel,
                    !formState.startingWeightDate && styles.dateButtonPlaceholder,
                  ]}
                >
                  {formState.startingWeightDate || 'Select date'}
                </ThemedText>
              </TouchableOpacity>
              {formState.startingWeightDate ? (
                <TouchableOpacity style={styles.clearDateButton} onPress={clearDate}>
                  <ThemedText style={styles.clearDateText}>Clear</ThemedText>
                </TouchableOpacity>
              ) : null}
            </View>
            {isWeb &&
              React.createElement('input', {
                type: 'date',
                max: todayIso,
                ref: webDateInputRef,
                value: formState.startingWeightDate || '',
                onChange: handleWebDateChange,
                style: WEB_DATE_INPUT_STYLE,
              })}
            <ThemedText style={styles.helperText}>Use the day you logged your starting weight.</ThemedText>
          </View>
        </ThemedView>

        <ThemedView style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Goal Weight</ThemedText>
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.inputLabel}>Target</ThemedText>
            <View style={styles.inlineField}>
              <TextInput
                style={[styles.textInput, styles.flex]}
                value={formState.goalWeight}
                onChangeText={(text) => handleChange({ goalWeight: text })}
                placeholder="180"
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholderTextColor={theme.textTertiary}
              />
              <View style={styles.unitGroup}>
                {weightUnitOptions.map((unit) => (
                  <TouchableOpacity
                    key={`goal-unit-${unit}`}
                    style={[styles.unitButton, formState.goalWeightUnit === unit && styles.unitButtonActive]}
                    onPress={() => handleChange({ goalWeightUnit: unit })}
                  >
                    <ThemedText
                      style={[
                        styles.unitButtonLabel,
                        formState.goalWeightUnit === unit && styles.unitButtonLabelActive,
                      ]}
                    >
                      {unit.toUpperCase()}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ThemedView>

        <ThemedView style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Weekly Goal</ThemedText>
          <View style={styles.segmentRow}>
            {weeklyGoalOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.segmentButton,
                  formState.weeklyGoalType === option.value && styles.segmentButtonActive,
                ]}
                onPress={() => handleChange({ weeklyGoalType: option.value })}
              >
                <ThemedText
                  style={[
                    styles.segmentButtonLabel,
                    formState.weeklyGoalType === option.value && styles.segmentButtonLabelActive,
                  ]}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          {selectedWeeklyGoal ? (
            <ThemedText style={styles.helperText}>{selectedWeeklyGoal.helper}</ThemedText>
          ) : null}
          {formState.weeklyGoalType !== 'maintain' ? (
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.inputLabel}>Change per week</ThemedText>
              <TextInput
                style={styles.textInput}
                value={formState.weeklyGoalRate}
                onChangeText={(text) => handleChange({ weeklyGoalRate: text })}
                placeholder="2"
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholderTextColor={theme.textTertiary}
              />
              <ThemedText style={styles.helperText}>
                {formState.goalWeightUnit.toUpperCase()} per week
              </ThemedText>
            </View>
          ) : null}
        </ThemedView>

        <ThemedView style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Activity Level</ThemedText>
          <View style={styles.activityList}>
            {activityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.activityRow,
                  formState.activityLevel === option.value && styles.activityRowActive,
                ]}
                onPress={() => handleChange({ activityLevel: option.value })}
              >
                <ThemedText
                  style={[
                    styles.activityLabel,
                    formState.activityLevel === option.value && styles.activityLabelActive,
                  ]}
                >
                  {option.label}
                </ThemedText>
                <ThemedText style={styles.activityHelper}>{option.helper}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, (!dirty || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!dirty || saving}
        >
          <ThemedText style={styles.saveButtonLabel}>{saving ? 'Saving…' : 'Save Goals'}</ThemedText>
        </TouchableOpacity>
      </View>

      <Modal transparent visible={iosDatePickerVisible} animationType="fade" onRequestClose={closeIosPicker}>
        <TouchableWithoutFeedback onPress={closeIosPicker}>
          <View style={[styles.pickerBackdrop]} />
        </TouchableWithoutFeedback>
        <View style={styles.pickerSheet}>
          <ThemedText style={styles.pickerTitle}>Select date</ThemedText>
          <DateTimePicker
            value={iosDateValue}
            mode="date"
            display="spinner"
            onChange={(_event, date) => {
              if (date) {
                setIosDateValue(date);
              }
            }}
            maximumDate={new Date()}
            style={styles.iosPicker}
          />
          <View style={styles.pickerActions}>
            <TouchableOpacity style={styles.pickerActionButton} onPress={closeIosPicker}>
              <ThemedText style={styles.pickerActionText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerActionButton} onPress={confirmIosPicker}>
              <ThemedText style={styles.pickerActionTextPrimary}>Set Date</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const mapGoalsToForm = (goals: ProfileGoals): FormState => ({
  startingWeight: typeof goals.startingWeight === 'number' ? String(goals.startingWeight) : '',
  startingWeightDate: goals.startingWeightRecordedAt ? formatDateInput(goals.startingWeightRecordedAt) : '',
  startingWeightUnit: goals.startingWeightUnit ?? 'lb',
  goalWeight: typeof goals.goalWeight === 'number' ? String(goals.goalWeight) : '',
  goalWeightUnit: goals.goalWeightUnit ?? 'lb',
  weeklyGoalRate: typeof goals.weeklyGoalRate === 'number' ? String(goals.weeklyGoalRate) : '',
  weeklyGoalType: goals.weeklyGoalType ?? 'maintain',
  activityLevel: goals.activityLevel ?? 'not_active',
});

const formatDateInput = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
};

const WEB_DATE_INPUT_STYLE: React.CSSProperties = {
  position: 'absolute',
  opacity: 0,
  pointerEvents: 'none',
  width: 0,
  height: 0,
  border: 'none',
  padding: 0,
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: 20,
      gap: 20,
      paddingBottom: 140,
    },
    header: {
      gap: 6,
    },
    subtitle: {
      color: theme.textSecondary,
    },
    sectionCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 18,
      gap: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
    },
    fieldGroup: {
      gap: 8,
    },
    inputLabel: {
      color: theme.textSecondary,
      fontSize: 13,
    },
    helperText: {
      color: theme.textTertiary,
      fontSize: 12,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dateButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.cardElevated,
    },
    dateButtonLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    dateButtonPlaceholder: {
      color: theme.textTertiary,
      fontWeight: '400',
    },
    clearDateButton: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardElevated,
    },
    clearDateText: {
      color: theme.textSecondary,
      fontWeight: '600',
    },
    pickerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.modalBackdrop,
    },
    pickerSheet: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 40,
      borderRadius: 24,
      padding: 20,
      gap: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    pickerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    iosPicker: {
      backgroundColor: theme.card,
    },
    pickerActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 8,
    },
    pickerActionButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    pickerActionText: {
      color: theme.textSecondary,
      fontWeight: '600',
    },
    pickerActionTextPrimary: {
      color: theme.primary,
      fontWeight: '700',
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.cardElevated,
    },
    unitGroup: {
      flexDirection: 'row',
      gap: 8,
      marginLeft: 12,
    },
    unitButton: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.cardElevated,
    },
    unitButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    unitButtonLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    unitButtonLabelActive: {
      color: theme.onPrimary,
    },
    inlineField: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    flex: {
      flex: 1,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: 8,
    },
    segmentButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: theme.cardElevated,
    },
    segmentButtonActive: {
      backgroundColor: theme.secondary,
      borderColor: theme.secondary,
    },
    segmentButtonLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    segmentButtonLabelActive: {
      color: theme.onSecondary,
    },
    activityList: {
      gap: 12,
    },
    activityRow: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      gap: 4,
      backgroundColor: theme.cardElevated,
    },
    activityRowActive: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}15`,
    },
    activityLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    activityLabelActive: {
      color: theme.primary,
    },
    activityHelper: {
      color: theme.textSecondary,
      fontSize: 13,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 20,
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    saveButton: {
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      backgroundColor: theme.primary,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonLabel: {
      color: theme.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      color: theme.textSecondary,
    },
    errorCard: {
      borderRadius: 16,
      padding: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: theme.danger,
      backgroundColor: `${theme.danger}15`,
    },
    errorTitle: {
      fontWeight: '600',
      color: theme.danger,
    },
    errorMessage: {
      color: theme.text,
    },
    retryButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.danger,
    },
    retryButtonText: {
      color: theme.danger,
      fontWeight: '600',
    },
  });


