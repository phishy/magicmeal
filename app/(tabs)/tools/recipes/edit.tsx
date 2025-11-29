import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Ref } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import type { Theme } from '@/constants/theme';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { getFoodById, updateFood } from '@/services/foods';
import {
    createEmptyNutritionValues,
    createNutritionValuesFromFood,
    nutritionFieldConfigs,
    type NutritionFieldKey,
    type NutritionFormValues,
} from './nutritionFields';
import { validateFoodForm, type FoodFormErrors } from './validation';

export default function EditFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const foodId = typeof params.id === 'string' ? params.id : undefined;
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [servingsPerContainer, setServingsPerContainer] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FoodFormErrors>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [nutritionValues, setNutritionValues] = useState<NutritionFormValues>(createEmptyNutritionValues());
  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionRef = useRef<TextInput>(null);
  const servingSizeRef = useRef<TextInput>(null);
  const servingsPerContainerRef = useRef<TextInput>(null);
  const nutritionInputRefs = useRef<Record<NutritionFieldKey, TextInput | null>>({} as Record<NutritionFieldKey, TextInput | null>);

  const handleNutritionChange = (key: NutritionFieldKey, value: string) => {
    setNutritionValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const focusFirstError = (errors: FoodFormErrors) => {
    if (errors.description && descriptionRef.current) {
      descriptionRef.current.focus();
      return;
    }
    if (errors.servingSize && servingSizeRef.current) {
      servingSizeRef.current.focus();
      return;
    }
    if (errors.servingsPerContainer && servingsPerContainerRef.current) {
      servingsPerContainerRef.current.focus();
      return;
    }
    if (errors.nutrition) {
      for (const field of nutritionFieldConfigs) {
        if (errors.nutrition?.[field.key]) {
          nutritionInputRefs.current[field.key]?.focus();
          return;
        }
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadFood() {
      if (!foodId) {
        setInitialError('Missing food identifier.');
        setInitialLoading(false);
        return;
      }
      try {
        const food = await getFoodById(foodId);
        if (!isMounted) return;
        setBrandName(food.brandName ?? '');
        setDescription(food.description);
        setServingSize(food.servingSize);
        setServingsPerContainer(String(food.servingsPerContainer));
        setNutritionValues(createNutritionValuesFromFood(food));
        setFieldErrors({});
        setBannerError(null);
      } catch (error: any) {
        if (!isMounted) return;
        setInitialError(error?.message ?? 'Unable to load this food.');
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    }
    loadFood();
    return () => {
      isMounted = false;
    };
  }, [foodId]);

  const handleSubmit = async () => {
    setBannerError(null);
    if (!foodId) {
      setBannerError('Missing food identifier.');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    const { errors, isValid, servingsValue, nutritionPayload } = validateFoodForm({
      description,
      servingSize,
      servingsPerContainer,
      nutritionValues,
    });

    setFieldErrors(errors);

    if (!isValid || !servingsValue || !nutritionPayload) {
      setBannerError('Please fix the highlighted fields below.');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      focusFirstError(errors);
      return;
    }

    setSubmitting(true);
    try {
      await updateFood({
        id: foodId,
        brandName: brandName.trim() || undefined,
        description: description.trim(),
        servingSize: servingSize.trim(),
        servingsPerContainer: servingsValue,
        ...nutritionPayload,
      });
      setFieldErrors({});
      router.back();
    } catch (error: any) {
      setBannerError(error?.message ?? 'Unable to save changes right now.');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (initialLoading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }

    if (initialError) {
      return (
        <View style={styles.errorState}>
          <ThemedText style={styles.errorText}>{initialError}</ThemedText>
          <TouchableOpacity onPress={() => router.back()} style={[styles.submitButton, { backgroundColor: theme.primary }]}>
            <ThemedText style={[styles.submitButtonText, { color: theme.onPrimary }]}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <View style={styles.header}>
          <ThemedText type="title">Edit Food</ThemedText>
          <ThemedText style={styles.subtitle}>Update the details for this saved food.</ThemedText>
        </View>

        {bannerError ? (
          <View style={[styles.banner, { borderColor: theme.danger }]}>
            <ThemedText style={[styles.bannerTitle, { color: theme.danger }]}>Needs attention</ThemedText>
            <ThemedText style={styles.bannerMessage}>{bannerError}</ThemedText>
          </View>
        ) : null}

        <View style={styles.formGroup}>
          <InputField
            label="Brand Name"
            value={brandName}
            onChangeText={setBrandName}
            placeholder="ex. Campbell's"
            theme={theme}
            optional
          />
          <InputField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="ex. Chicken Soup"
            theme={theme}
            required
            inputRef={descriptionRef}
            errorText={fieldErrors.description}
          />
          <InputField
            label="Serving Size"
            value={servingSize}
            onChangeText={setServingSize}
            placeholder="ex. 1 cup"
            theme={theme}
            required
            inputRef={servingSizeRef}
            errorText={fieldErrors.servingSize}
          />
          <InputField
            label="Servings per container"
            value={servingsPerContainer}
            onChangeText={setServingsPerContainer}
            placeholder="1"
            keyboardType="decimal-pad"
            theme={theme}
            required
            inputRef={servingsPerContainerRef}
            errorText={fieldErrors.servingsPerContainer}
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>Nutrition Facts</ThemedText>
          <View style={styles.nutritionList}>
            {nutritionFieldConfigs.map((field, index) => (
              <NutritionFieldRow
                key={field.key}
                label={field.label}
                unit={field.unit}
                required={field.required}
                value={nutritionValues[field.key]}
                onChangeText={(text) => handleNutritionChange(field.key, text)}
                theme={theme}
                isLast={index === nutritionFieldConfigs.length - 1}
                inputRef={(ref) => {
                  nutritionInputRefs.current[field.key] = ref;
                }}
                errorText={fieldErrors.nutrition?.[field.key]}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: theme.primary }, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.9}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={theme.onPrimary} />
          ) : (
            <ThemedText style={[styles.submitButtonText, { color: theme.onPrimary }]}>Save Changes</ThemedText>
          )}
        </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 24, android: 0 })}
      >
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  theme,
  optional,
  required,
  keyboardType,
  inputRef,
  errorText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  theme: Theme;
  optional?: boolean;
  required?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  inputRef?: Ref<TextInput>;
  errorText?: string;
}) => {
  const autoCap = keyboardType && keyboardType !== 'default' ? 'none' : 'sentences';
  return (
    <View style={stylesField.field}>
      <View style={stylesField.labelRow}>
        <ThemedText style={stylesField.labelText}>{label}</ThemedText>
        {required ? (
          <ThemedText style={[stylesField.metaText, { color: theme.danger }]}>Required</ThemedText>
        ) : optional ? (
          <ThemedText style={[stylesField.metaText, { color: theme.textTertiary }]}>Optional</ThemedText>
        ) : null}
      </View>
      <TextInput
        ref={inputRef}
        style={[
          stylesField.input,
          {
            borderColor: errorText ? theme.danger : theme.border,
            color: theme.text,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCap}
        keyboardType={keyboardType}
      />
      {errorText ? <ThemedText style={[stylesField.errorText, { color: theme.danger }]}>{errorText}</ThemedText> : null}
    </View>
  );
};

const NutritionFieldRow = ({
  label,
  unit,
  value,
  required,
  onChangeText,
  theme,
  isLast,
  inputRef,
  errorText,
}: {
  label: string;
  unit?: string;
  value: string;
  required?: boolean;
  onChangeText: (val: string) => void;
  theme: Theme;
  isLast?: boolean;
  inputRef?: Ref<TextInput>;
  errorText?: string;
}) => {
  const showError = Boolean(errorText);
  return (
    <View
      style={[
        stylesNutrition.row,
        {
          borderColor: showError ? theme.danger : theme.border,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={stylesNutrition.labelColumn}>
        <ThemedText style={stylesNutrition.label}>{label}</ThemedText>
        {unit ? <ThemedText style={[stylesNutrition.unit, { color: theme.textTertiary }]}>{unit}</ThemedText> : null}
        {showError ? (
          <ThemedText style={[stylesNutrition.errorText, { color: theme.danger }]}>{errorText}</ThemedText>
        ) : null}
      </View>
      <TextInput
        ref={inputRef}
        style={[stylesNutrition.input, { color: theme.text }]}
        placeholder={required ? undefined : 'Optional'}
        placeholderTextColor={theme.textTertiary}
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChangeText}
        textAlign="right"
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      gap: 20,
    },
    loadingState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    errorState: {
      flex: 1,
      gap: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    header: {
      marginTop: 16,
      gap: 6,
    },
    subtitle: {
      color: theme.textSecondary,
    },
    formGroup: {
      gap: 16,
    },
    section: {
      gap: 8,
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    nutritionList: {
      borderRadius: 16,
      backgroundColor: theme.card,
      overflow: 'hidden',
    },
    errorText: {
      color: theme.danger,
      textAlign: 'center',
    },
    submitButton: {
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    banner: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
      gap: 4,
      backgroundColor: theme.card,
    },
    bannerTitle: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    bannerMessage: {
      fontSize: 14,
      color: theme.text,
      textAlign: 'left',
    },
  });

const stylesField = StyleSheet.create({
  field: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 13,
  },
});

const stylesNutrition = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  labelColumn: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  unit: {
    fontSize: 12,
  },
  input: {
    minWidth: 80,
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});

