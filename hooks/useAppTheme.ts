/**
 * useAppTheme Hook
 *
 * Provides theme-aware colors and utilities.
 * Extracted from lib/theme for proper separation of concerns.
 */

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

  // Semantic color tokens that adapt to theme
  const colors = {
    // Backgrounds
    background: theme.colors.background,
    surface: theme.colors.searchBg, // Elevated surface (cards)
    surfaceAlt: isDark ? '#27272A' : '#F4F4F5',

    // Text
    text: theme.colors.grey0, // Primary text
    textMuted: theme.colors.grey2, // Secondary text
    textInverse: isDark ? '#18181B' : '#FAFAFA',

    // Borders
    border: theme.colors.grey5,
    borderMuted: isDark ? '#3F3F46' : '#D4D4D8',

    // Brand
    primary: theme.colors.primary,
    primaryDark: PRIMARY.dark,
    primaryLight: PRIMARY.light,

    // Semantic
    success: theme.colors.success,
    error: theme.colors.error,
    warning: theme.colors.warning,
    info: SEMANTIC.info,

    // Severity (for incidents)
    severity: SEVERITY_COLORS,
  };

  return {
    theme,
    colors,
    isDark,
    mode,
    setMode,
    toggleMode: () => setMode(isDark ? 'light' : 'dark'),
  };
}
