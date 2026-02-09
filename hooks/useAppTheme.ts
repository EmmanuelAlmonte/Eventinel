/**
 * useAppTheme Hook
 *
 * Provides theme-aware colors and utilities.
 * Extracted from lib/theme for proper separation of concerns.
 */

import { useCallback, useMemo } from 'react';
import { useTheme as useRNETheme, useThemeMode } from '@rneui/themed';
import { PRIMARY, SEMANTIC, SEVERITY_COLORS } from '@lib/brand/colors';

/**
 * Custom hook that provides theme-aware colors and utilities.
 * Use this instead of importing BRAND colors directly.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { colors, isDark } = useAppTheme();
 *   return <View style={{ backgroundColor: colors.background }} />;
 * }
 * ```
 */
export function useAppTheme() {
  const { theme } = useRNETheme();
  const { mode, setMode } = useThemeMode();

  const isDark = mode === 'dark';

  // Pull primitives so memoization works even if `theme.colors` is a new object per render.
  const {
    background,
    searchBg,
    grey0,
    grey2,
    grey5,
    primary,
    success,
    error,
    warning,
  } = theme.colors;

  // Semantic color tokens that adapt to theme.
  // Memoized to keep object identity stable between renders (improves list row memoization).
  const colors = useMemo(
    () => ({
      // Backgrounds
      background,
      surface: searchBg, // Elevated surface (cards)
      surfaceAlt: isDark ? '#27272A' : '#F4F4F5',

      // Text
      text: grey0, // Primary text
      textMuted: grey2, // Secondary text
      textInverse: isDark ? '#18181B' : '#FAFAFA',

      // Borders
      border: grey5,
      borderMuted: isDark ? '#3F3F46' : '#D4D4D8',

      // Brand
      primary,
      primaryDark: PRIMARY.dark,
      primaryLight: PRIMARY.light,

      // Semantic
      success,
      error,
      warning,
      info: SEMANTIC.info,

      // Severity (for incidents)
      severity: SEVERITY_COLORS,
    }),
    [
      background,
      searchBg,
      grey0,
      grey2,
      grey5,
      primary,
      success,
      error,
      warning,
      isDark,
    ]
  );

  const toggleMode = useCallback(() => {
    setMode(isDark ? 'light' : 'dark');
  }, [isDark, setMode]);

  return {
    theme,
    colors,
    isDark,
    mode,
    setMode,
    toggleMode,
  };
}
