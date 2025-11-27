/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import type { Theme } from '@/constants/theme';
import { useAppTheme } from '@/providers/ThemePreferenceProvider';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof Theme
) {
  const { colorScheme, theme } = useAppTheme();
  const colorFromProps = props[colorScheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return theme[colorName];
  }
}
