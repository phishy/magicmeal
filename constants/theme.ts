/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#007AFF';
const tintColorDark = '#5B9FED';

export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    background: '#FFFFFF',
    backgroundSecondary: '#F8F9FA',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    tint: tintColorLight,
    primary: '#007AFF',
    secondary: '#FF9500',
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
    icon: '#687076',
    tabIconDefault: '#8E8E93',
    tabIconSelected: tintColorLight,
    border: '#E5E5EA',
    separator: '#E5E5EA',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#98989D',
    textTertiary: '#636366',
    background: '#0F0F1E',
    backgroundSecondary: '#1A1A2E',
    card: '#1E1E2E',
    cardElevated: '#252538',
    tint: tintColorDark,
    primary: '#5B9FED',
    secondary: '#FFA726',
    success: '#34C759',
    danger: '#FF453A',
    warning: '#FFA726',
    icon: '#98989D',
    tabIconDefault: '#636366',
    tabIconSelected: tintColorDark,
    border: '#2A2A3E',
    separator: '#2A2A3E',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
