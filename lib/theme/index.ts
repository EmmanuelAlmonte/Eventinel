/**
 * React Native Elements Theme Configuration
 *
 * Maps Eventinel BRAND design tokens to RNE theme format.
 * Supports both light and dark modes with automatic system detection.
 *
 * @example
 * ```tsx
 * import { ThemeProvider } from '@rneui/themed';
 * import { theme } from '@eventinel/theme';
 *
 * function App() {
 *   return (
 *     <ThemeProvider theme={theme}>
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */

import { createTheme, Colors, useTheme as useRNETheme, useThemeMode } from '@rneui/themed';
import { PRIMARY, SEMANTIC, SEVERITY_COLORS } from '../brand/colors';
import { WEIGHTS, TYPE_SCALE } from '../brand/typography';

// ============ DARK MODE COLORS ============
const darkColors = {
  // Core colors
  primary: PRIMARY.DEFAULT,
  secondary: PRIMARY.dark,
  background: '#09090B',        // zinc-950
  white: '#FAFAFA',             // zinc-50
  black: '#09090B',             // zinc-950

  // Grey scale (dark mode)
  grey0: '#FAFAFA',             // text primary
  grey1: '#E4E4E7',             // zinc-200
  grey2: '#A1A1AA',             // zinc-400 - text muted
  grey3: '#71717A',             // zinc-500
  grey4: '#52525B',             // zinc-600
  grey5: '#27272A',             // zinc-800 - borders
  greyOutline: '#27272A',       // borders

  // Surfaces
  searchBg: '#18181B',          // elevated surface

  // Semantic
  success: SEMANTIC.safe,
  error: SEMANTIC.alert,
  warning: SEMANTIC.warning,
  disabled: '#3F3F46',          // zinc-700

  // Platform overrides
  platform: {
    ios: { primary: PRIMARY.DEFAULT, secondary: PRIMARY.dark, grey: '#71717A', searchBg: '#18181B', success: SEMANTIC.safe, error: SEMANTIC.alert, warning: SEMANTIC.warning },
    android: { primary: PRIMARY.DEFAULT, secondary: PRIMARY.dark, grey: '#71717A', searchBg: '#18181B', success: SEMANTIC.safe, error: SEMANTIC.alert, warning: SEMANTIC.warning },
    web: { primary: PRIMARY.DEFAULT, secondary: PRIMARY.dark, grey: '#71717A', searchBg: '#18181B', success: SEMANTIC.safe, error: SEMANTIC.alert, warning: SEMANTIC.warning },
    default: { primary: PRIMARY.DEFAULT, secondary: PRIMARY.dark, grey: '#71717A', searchBg: '#18181B', success: SEMANTIC.safe, error: SEMANTIC.alert, warning: SEMANTIC.warning },
  },
} satisfies Partial<Colors>;

// ============ LIGHT MODE COLORS ============
const lightColors = {
  // Core colors
  primary: PRIMARY.DEFAULT,
  secondary: PRIMARY.dark,
  background: '#FFFFFF',        // white
  white: '#FFFFFF',             // white
  black: '#09090B',             // zinc-950

  // Grey scale (light mode)
  grey0: '#18181B',             // text primary (dark on light)
  grey1: '#27272A',             // zinc-800
  grey2: '#52525B',             // zinc-600 - text muted
  grey3: '#71717A',             // zinc-500
  grey4: '#A1A1AA',             // zinc-400
  grey5: '#E4E4E7',             // zinc-200 - borders
  greyOutline: '#E4E4E7',       // borders

  // Surfaces
  searchBg: '#F4F4F5',          // zinc-100 - elevated surface

  // Semantic
  success: SEMANTIC.safe,
  error: SEMANTIC.alert,
  warning: SEMANTIC.warning,
  disabled: '#D4D4D8',          // zinc-300

  // Platform overrides
  platform: {
    ios: { primary: PRIMARY.DEFAULT, secondary: PRIMARY.dark, grey: '#71717A', searchBg: '#F4F4F5', success: SEMANTIC.safe, error: SEMANTIC.alert, warning: SEMANTIC.warning },
    android: { primary: PRIMARY.DEFAULT, secondary: PRIMARY.dark, grey: '#71717A', searchBg: '#F4F4F5', success: SEMANTIC.safe, error: SEMANTIC.alert, warning: SEMANTIC.warning },
    web: { primary: PRIMARY.DEFAULT, secondary: PRIMARY.dark, grey: '#71717A', searchBg: '#F4F4F5', success: SEMANTIC.safe, error: SEMANTIC.alert, warning: SEMANTIC.warning },
    default: { primary: PRIMARY.DEFAULT, secondary: PRIMARY.dark, grey: '#71717A', searchBg: '#F4F4F5', success: SEMANTIC.safe, error: SEMANTIC.alert, warning: SEMANTIC.warning },
  },
} satisfies Partial<Colors>;

/**
 * Eventinel RNE Theme
 *
 * Supports light and dark mode with purple primary accent.
 * Default mode follows system preference.
 */
export const theme = createTheme({
  // Default to dark, but can be changed via useThemeMode
  mode: 'dark',

  // Separate color palettes for each mode
  lightColors,
  darkColors,

  // Component-level theming (uses theme colors automatically)
  components: {
    // ============ BUTTON ============
    Button: {
      raised: true,
      radius: 8,
      titleStyle: {
        fontWeight: String(WEIGHTS.semibold) as '600',
        fontSize: TYPE_SCALE.body.size,
      },
      buttonStyle: {
        paddingVertical: 12,
        paddingHorizontal: 20,
      },
    },

    // ============ INPUT ============
    Input: {
      inputContainerStyle: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
      },
      inputStyle: {
        fontSize: TYPE_SCALE.body.size,
      },
      labelStyle: {
        fontWeight: String(WEIGHTS.medium) as '500',
        fontSize: TYPE_SCALE.bodySmall.size,
        marginBottom: 6,
      },
      errorStyle: {
        color: SEMANTIC.alert,
        fontSize: TYPE_SCALE.caption.size,
      },
    },

    // ============ CARD ============
    Card: {
      containerStyle: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        margin: 0,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
      },
      wrapperStyle: {
        padding: 0,
      },
    },

    // ============ LIST ITEM ============
    ListItem: {
      containerStyle: {
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
      },
    },

    // ============ TEXT ============
    Text: {
      style: {
        fontSize: TYPE_SCALE.body.size,
      },
      h1Style: {
        fontSize: TYPE_SCALE.h1.size.max,
        fontWeight: String(TYPE_SCALE.h1.weight) as '800',
        lineHeight: TYPE_SCALE.h1.size.max * TYPE_SCALE.h1.lineHeight,
      },
      h2Style: {
        fontSize: TYPE_SCALE.h2.size.max,
        fontWeight: String(TYPE_SCALE.h2.weight) as '700',
        lineHeight: TYPE_SCALE.h2.size.max * TYPE_SCALE.h2.lineHeight,
      },
      h3Style: {
        fontSize: TYPE_SCALE.h3.size.max,
        fontWeight: String(TYPE_SCALE.h3.weight) as '700',
        lineHeight: TYPE_SCALE.h3.size.max * TYPE_SCALE.h3.lineHeight,
      },
      h4Style: {
        fontSize: TYPE_SCALE.h4.size.max,
        fontWeight: String(TYPE_SCALE.h4.weight) as '600',
        lineHeight: TYPE_SCALE.h4.size.max * TYPE_SCALE.h4.lineHeight,
      },
    },

    // ============ BADGE ============
    Badge: {
      badgeStyle: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        height: 'auto',
      },
      textStyle: {
        fontSize: TYPE_SCALE.caption.size,
        fontWeight: String(WEIGHTS.semibold) as '600',
      },
    },

    // ============ DIVIDER ============
    Divider: {
      width: 1,
      style: {
        marginVertical: 12,
      },
    },

    // ============ AVATAR ============
    Avatar: {
      rounded: true,
      containerStyle: {
        backgroundColor: PRIMARY.DEFAULT,
      },
      titleStyle: {
        fontWeight: String(WEIGHTS.bold) as '700',
      },
    },

    // ============ ICON ============
    Icon: {
      size: 24,
    },

    // ============ SEARCH BAR ============
    SearchBar: {
      containerStyle: {
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        borderBottomWidth: 0,
        paddingHorizontal: 0,
      },
      inputContainerStyle: {
        borderRadius: 8,
        borderWidth: 1,
      },
    },

    // ============ SWITCH ============
    Switch: {
      trackColor: {
        false: '#52525B',
        true: PRIMARY.light,
      },
    },

    // ============ OVERLAY ============
    Overlay: {
      overlayStyle: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 20,
      },
      backdropStyle: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      },
    },

    // ============ BOTTOM SHEET ============
    BottomSheet: {
      containerStyle: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderWidth: 1,
        borderBottomWidth: 0,
      },
    },
  },
});

// ============ THEME HOOKS & UTILITIES ============

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
    surface: theme.colors.searchBg,       // Elevated surface (cards)
    surfaceAlt: isDark ? '#27272A' : '#F4F4F5',

    // Text
    text: theme.colors.grey0,             // Primary text
    textMuted: theme.colors.grey2,        // Secondary text
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

// Re-export RNE hooks for convenience
export { useTheme, useThemeMode } from '@rneui/themed';

// Export severity colors for incident-specific styling
export { SEVERITY_COLORS } from '../brand/colors';

// Export semantic colors for status indicators
export const statusColors = {
  success: SEMANTIC.safe,
  error: SEMANTIC.alert,
  warning: SEMANTIC.warning,
  info: SEMANTIC.info,
} as const;

// Export spacing scale (based on 4px grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Export border radius scale
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// Re-export BRAND for direct access when needed
export { BRAND } from '../brand';

// Type for the theme
export type EventinelTheme = typeof theme;
