import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AI_PROVIDER_OPTIONS, ensureModelForProvider } from '@/constants/ai';
import type { Theme } from '@/constants/theme';
import { useDeveloperSettings } from '@/providers/DeveloperSettingsProvider';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';
import { isAiProviderReady } from '@/services/ai';
import { listFoodSearchAdapters } from '@/services/foodSearch';
import { fetchOllamaModels } from '@/services/ollama';
import type { AiModelOption, AiProviderId, FoodSearchAdapter } from '@/types';

export default function DeveloperSettingsScreen() {
  const { theme } = useAppTheme();
  const { settings, updateSettings, isReady } = useDeveloperSettings();
  const [modelInput, setModelInput] = useState(settings.aiModelId);
  const [loadingOllamaModels, setLoadingOllamaModels] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<AiModelOption[]>([]);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  useEffect(() => {
    let abortController = new AbortController();

    const loadOllamaModels = async () => {
      const provider = AI_PROVIDER_OPTIONS.ollama;
      if (!provider.supportsDynamicModels) return;
      if (!settings.aiProviderId || settings.aiProviderId !== 'ollama') {
        return;
      }

      setLoadingOllamaModels(true);
      const models = await fetchOllamaModels({ signal: abortController.signal });
      if (models.length) {
        setOllamaModels(models);
      }
      setLoadingOllamaModels(false);
    };

    loadOllamaModels();

    return () => {
      abortController.abort();
    };
  }, [settings.aiProviderId]);

  useEffect(() => {
    setModelInput(settings.aiModelId);
  }, [settings.aiModelId]);

  useEffect(() => {
    if (settings.aiProviderId !== 'ollama') {
      return;
    }
    if (!ollamaModels.length) {
      return;
    }

    const hasSelectedModel =
      !!settings.aiModelId &&
      ollamaModels.some((model) => model.id === settings.aiModelId);

    if (!hasSelectedModel) {
      const nextModelId = ollamaModels[0]?.id ?? ensureModelForProvider('ollama');
      setModelInput(nextModelId);
      updateSettings({ aiModelId: nextModelId });
    }
  }, [ollamaModels, settings.aiModelId, settings.aiProviderId, updateSettings]);

  const providerOptions = useMemo(() => Object.values(AI_PROVIDER_OPTIONS), []);
  const foodSearchAdapters = useMemo<FoodSearchAdapter[]>(() => listFoodSearchAdapters(), []);

  const handleProviderChange = (providerId: AiProviderId) => {
    if (providerId === settings.aiProviderId) {
      return;
    }
    updateSettings({
      aiProviderId: providerId,
      aiModelId: ensureModelForProvider(providerId),
    });
  };

  const handleModelSelect = (model: AiModelOption) => {
    setModelInput(model.id);
    updateSettings({ aiModelId: model.id });
  };

  const handleModelInputChange = (value: string) => {
    setModelInput(value);
    updateSettings({ aiModelId: value });
  };

  const activeProvider = AI_PROVIDER_OPTIONS[settings.aiProviderId];
  const styles = createStyles(theme);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loader}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText style={styles.loaderText}>Loading developer settings…</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <ThemedText type="subtitle">Default Food Search</ThemedText>
          <ThemedText style={styles.sectionHelper}>
            Choose which provider powers searches on the food search screen by default.
          </ThemedText>
          <View style={styles.providerList}>
            {foodSearchAdapters.map((adapter) => {
              const isActive = settings.foodSearchProviderId === adapter.id;
              return (
                <TouchableOpacity
                  key={adapter.id}
                  style={[
                    styles.providerOption,
                    isActive && styles.providerOptionActive,
                  ]}
                  onPress={() => updateSettings({ foodSearchProviderId: adapter.id })}
                >
                  <View style={styles.providerHeader}>
                    <ThemedText style={styles.providerTitle}>{adapter.label}</ThemedText>
                    {isActive ? (
                      <IconSymbol name="checkmark.circle.fill" size={18} color={theme.primary} />
                    ) : null}
                  </View>
                  <ThemedText style={styles.providerDescription}>
                    {adapter.id === 'ai-fast'
                      ? 'Fast AI answers with nutrition estimates'
                      : 'Open Food Facts community database'}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, styles.sectionSpacing]}>
          <ThemedText type="subtitle">AI Provider</ThemedText>
          <View style={styles.providerList}>
            {providerOptions.map((provider) => {
              const isSelected = provider.id === settings.aiProviderId;
              const isReady =
                provider.id === 'openai' ? true : isAiProviderReady(provider.id);

              return (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.providerOption,
                    isSelected && styles.providerOptionActive,
                    !isReady && styles.providerOptionDisabled,
                  ]}
                  onPress={() => handleProviderChange(provider.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.providerHeader}>
                    <ThemedText style={styles.providerTitle}>{provider.label}</ThemedText>
                    {isSelected ? (
                      <IconSymbol name='checkmark.circle.fill' size={18} color={theme.primary} />
                    ) : null}
                  </View>
                  <ThemedText style={styles.providerDescription}>{provider.description}</ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, styles.sectionSpacing]}>
          <ThemedText type="subtitle">Model</ThemedText>
          <ThemedText style={styles.sectionHelper}>
            Applies to food search and weight import flows.
          </ThemedText>

          <TouchableOpacity
            style={styles.selectControl}
            onPress={() => setModelPickerVisible(true)}
            activeOpacity={0.9}
          >
            <View style={styles.selectControlContent}>
              <ThemedText style={styles.selectControlValue}>
                {getActiveModelLabel(
                  settings.aiModelId,
                  settings.aiProviderId === 'ollama' && ollamaModels.length ? ollamaModels : activeProvider.models
                )}
              </ThemedText>
              <IconSymbol name="chevron.down" size={16} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>
          {settings.aiProviderId === 'ollama' && loadingOllamaModels ? (
            <ThemedText style={styles.selectHelper}>Refreshing models...</ThemedText>
          ) : null}

          <View style={styles.inputBlock}>
            <ThemedText style={styles.inputLabel}>Custom model ID</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter full model name"
              placeholderTextColor={theme.textTertiary}
              value={modelInput}
              onChangeText={handleModelInputChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
            />
            <ThemedText style={styles.inputHelper}>
              We pass this value directly to the provider. Leave blank to reset to the default
              recommendation.
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={modelPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModelPickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModelPickerVisible(false)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.modalContainer}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Select Model
            </ThemedText>
            <ScrollView style={styles.modalList}>
              {(settings.aiProviderId === 'ollama' && ollamaModels.length
                ? ollamaModels
                : activeProvider.models
              ).map((model) => {
                const isActive = model.id === settings.aiModelId;
                return (
                  <TouchableOpacity
                    key={model.id}
                    style={[
                      styles.modalOption,
                      isActive && styles.modalOptionActive,
                    ]}
                    onPress={() => {
                      handleModelSelect(model);
                      setModelPickerVisible(false);
                    }}
                  >
                    <ThemedText style={styles.modalOptionTitle}>{model.label}</ThemedText>
                    <ThemedText style={styles.modalOptionSubtext}>{model.id}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setModelPickerVisible(false)}
            >
              <ThemedText style={styles.closeModalText}>Close</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      gap: 20,
      paddingBottom: 40,
    },
    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loaderText: {
      color: theme.textSecondary,
    },
    section: {
      gap: 12,
    },
    sectionSpacing: {
      marginTop: 24,
    },
    sectionHelper: {
      color: theme.textSecondary,
      fontSize: 14,
    },
    providerList: {
      gap: 12,
    },
    providerOption: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 16,
      backgroundColor: theme.card,
      gap: 8,
    },
    providerOptionActive: {
      borderColor: theme.primary,
    },
    providerOptionDisabled: {
      opacity: 0.5,
    },
    providerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    providerTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    providerDescription: {
      color: theme.textSecondary,
      fontSize: 14,
    },
    selectControl: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.card,
    },
    selectControlContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    selectControlValue: {
      fontWeight: '600',
    },
    selectHelper: {
      marginTop: 6,
      fontSize: 12,
      color: theme.textSecondary,
    },
    inputBlock: {
      gap: 8,
      marginTop: 8,
    },
    inputLabel: {
      fontWeight: '600',
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 12,
      color: theme.text,
      backgroundColor: theme.card,
    },
    inputHelper: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    modalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      borderRadius: 18,
      padding: 20,
      gap: 16,
      maxHeight: '70%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    modalList: {
      maxHeight: 300,
    },
    modalOption: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalOptionActive: {
      borderBottomColor: theme.primary,
    },
    modalOptionTitle: {
      fontWeight: '600',
    },
    modalOptionSubtext: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    closeModalButton: {
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: theme.cardElevated,
    },
    closeModalText: {
      fontWeight: '600',
    },
  });

function getActiveModelLabel(modelId: string, options: AiModelOption[]) {
  return options.find((model) => model.id === modelId)?.label ?? 'Choose model';
}

