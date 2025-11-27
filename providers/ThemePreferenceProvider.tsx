import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import type { Theme, ThemeName, ThemePalette } from '@/constants/theme';
import { ThemePalettes, defaultThemeName } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const STORAGE_KEY = 'magicmeal.theme-name';

type ThemePreferenceContextValue = {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  palette: ThemePalette;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue>({
  themeName: defaultThemeName,
  setThemeName: () => {},
  palette: ThemePalettes[defaultThemeName],
});

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>(defaultThemeName);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!mounted || !stored) {
          return;
        }

        if (stored in ThemePalettes) {
          setThemeNameState(stored as ThemeName);
        }
      })
      .catch(() => {
        // Non-blocking: fall back to default theme.
      });

    return () => {
      mounted = false;
    };
  }, []);

  const persistTheme = useCallback((next: ThemeName) => {
    setThemeNameState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Ignore storage errors.
    });
  }, []);

  const value = useMemo<ThemePreferenceContextValue>(
    () => ({
      themeName,
      setThemeName: persistTheme,
      palette: ThemePalettes[themeName],
    }),
    [themeName, persistTheme]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  return useContext(ThemePreferenceContext);
}

export function useAppTheme(): {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  palette: ThemePalette;
  colorScheme: 'light' | 'dark';
  theme: Theme;
} {
  const colorScheme = useColorScheme() ?? 'light';
  const { palette, setThemeName, themeName } = useThemePreference();

  return {
    themeName,
    setThemeName,
    palette,
    colorScheme,
    theme: palette[colorScheme],
  };
}

