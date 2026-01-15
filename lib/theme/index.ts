/**
 * React Native Elements Theme Configuration
 *
 * Maps Eventinel BRAND design tokens to RNE theme format.
 * This creates a unified dark theme that matches the brand identity.
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

import { createTheme, Colors } from '@rneui/themed';
import { PRIMARY, SEMANTIC, NEUTRAL, SEVERITY_COLORS } from '../brand/colors';
import { WEIGHTS, TYPE_SCALE } from '../brand/typography';

/**
 * Extended color palette for Eventinel
 * Includes semantic colors, severity levels, and brand colors
 */
export const colors = {
  // RNE standard colors - mapped to BRAND
  primary: PRIMARY.DEFAULT,
  secondary: PRIMARY.dark,
  background: NEUTRAL.dark,
  white: NEUTRAL.textPrimary,
  black: NEUTRAL.dark,
  grey0: NEUTRAL.textPrimary,
  grey1: '#E4E4E7', // zinc-200
  grey2: '#A1A1AA', // zinc-400
  grey3: '#71717A', // zinc-500
  grey4: '#52525B', // zinc-600
  grey5: NEUTRAL.darkBorder,
  greyOutline: NEUTRAL.darkBorder,
  searchBg: NEUTRAL.darkElevated,
  success: SEMANTIC.safe,
  error: SEMANTIC.alert,
  warning: SEMANTIC.warning,
  disabled: '#3F3F46', // zinc-700

  // Extended palette
  platform: {
    ios: {
      primary: PRIMARY.DEFAULT,
      secondary: PRIMARY.dark,
      grey: '#71717A',
      searchBg: NEUTRAL.darkElevated,
      success: SEMANTIC.safe,
      error: SEMANTIC.alert,
      warning: SEMANTIC.warning,
    },
    android: {
      primary: PRIMARY.DEFAULT,
      secondary: PRIMARY.dark,
      grey: '#71717A',
      searchBg: NEUTRAL.darkElevated,
      success: SEMANTIC.safe,
      error: SEMANTIC.alert,
      warning: SEMANTIC.warning,
    },
    web: {
      primary: PRIMARY.DEFAULT,
      secondary: PRIMARY.dark,
      grey: '#71717A',
      searchBg: NEUTRAL.darkElevated,
      success: SEMANTIC.safe,
      error: SEMANTIC.alert,
      warning: SEMANTIC.warning,
    },
    default: {
      primary: PRIMARY.DEFAULT,
      secondary: PRIMARY.dark,
      grey: '#71717A',
      searchBg: NEUTRAL.darkElevated,
      success: SEMANTIC.safe,
      error: SEMANTIC.alert,
      warning: SEMANTIC.warning,
    },
  },
} satisfies Partial<Colors>;

/**
 * Eventinel RNE Theme
 *
 * Dark theme with purple primary accent, optimized for public safety app UX.
 */
export const theme = createTheme({
  // Light mode disabled - always dark
  mode: 'dark',

  // Color palette
  lightColors: colors,
  darkColors: colors,

  // Component-level theming
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
      disabledStyle: {
        backgroundColor: '#3F3F46',
      },
      disabledTitleStyle: {
        color: '#71717A',
      },
    },

    // ============ INPUT ============
    Input: {
      inputContainerStyle: {
        borderWidth: 1,
        borderColor: NEUTRAL.darkBorder,
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: NEUTRAL.darkElevated,
      },
      inputStyle: {
        color: NEUTRAL.textPrimary,
        fontSize: TYPE_SCALE.body.size,
      },
      placeholderTextColor: NEUTRAL.textMuted,
      labelStyle: {
        color: NEUTRAL.textPrimary,
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
        backgroundColor: NEUTRAL.darkElevated,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: NEUTRAL.darkBorder,
        padding: 16,
        margin: 0,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
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
        backgroundColor: NEUTRAL.darkElevated,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: NEUTRAL.darkBorder,
        marginBottom: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
      },
    },

    // ============ TEXT ============
    Text: {
      style: {
        color: NEUTRAL.textPrimary,
        fontSize: TYPE_SCALE.body.size,
      },
      h1Style: {
        color: NEUTRAL.textPrimary,
        fontSize: TYPE_SCALE.h1.size.max,
        fontWeight: String(TYPE_SCALE.h1.weight) as '800',
        lineHeight: TYPE_SCALE.h1.size.max * TYPE_SCALE.h1.lineHeight,
      },
      h2Style: {
        color: NEUTRAL.textPrimary,
        fontSize: TYPE_SCALE.h2.size.max,
        fontWeight: String(TYPE_SCALE.h2.weight) as '700',
        lineHeight: TYPE_SCALE.h2.size.max * TYPE_SCALE.h2.lineHeight,
      },
      h3Style: {
        color: NEUTRAL.textPrimary,
        fontSize: TYPE_SCALE.h3.size.max,
        fontWeight: String(TYPE_SCALE.h3.weight) as '700',
        lineHeight: TYPE_SCALE.h3.size.max * TYPE_SCALE.h3.lineHeight,
      },
      h4Style: {
        color: NEUTRAL.textPrimary,
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
      color: NEUTRAL.darkBorder,
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
        color: NEUTRAL.textPrimary,
        fontWeight: String(WEIGHTS.bold) as '700',
      },
    },

    // ============ ICON ============
    Icon: {
      color: NEUTRAL.textPrimary,
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
        backgroundColor: NEUTRAL.darkElevated,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: NEUTRAL.darkBorder,
      },
      inputStyle: {
        color: NEUTRAL.textPrimary,
      },
      placeholderTextColor: NEUTRAL.textMuted,
    },

    // ============ SWITCH ============
    Switch: {
      trackColor: {
        false: NEUTRAL.darkBorder,
        true: PRIMARY.light,
      },
      thumbColor: NEUTRAL.textPrimary,
    },

    // ============ OVERLAY ============
    Overlay: {
      overlayStyle: {
        backgroundColor: NEUTRAL.darkElevated,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: NEUTRAL.darkBorder,
        padding: 20,
      },
      backdropStyle: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      },
    },

    // ============ BOTTOM SHEET ============
    BottomSheet: {
      containerStyle: {
        backgroundColor: NEUTRAL.darkElevated,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: NEUTRAL.darkBorder,
      },
    },
  },
});

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

// Re-export BRAND for direct access
export { BRAND } from '../brand';

// Type for the theme
export type EventinelTheme = typeof theme;
