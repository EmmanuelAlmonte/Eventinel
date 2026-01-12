/**
 * @eventinel/brand
 *
 * Brand constants and design tokens for Eventinel
 *
 * @example
 * ```ts
 * import { BRAND, PRIMARY, SEMANTIC, TIMING } from '@eventinel/brand';
 *
 * // Use colors
 * const style = { background: PRIMARY.DEFAULT };
 *
 * // Use timing
 * const animation = { duration: TIMING.hover.duration };
 *
 * // Use all-in-one BRAND object
 * const color = BRAND.colors.primary.DEFAULT;
 * ```
 */

// Re-export everything from modules
export * from './colors';
export * from './typography';
export * from './motion';

// Import for unified export
import { PRIMARY, SEMANTIC, NEUTRAL, GRADIENTS, SEVERITY_COLORS, rgba } from './colors';
import { FONTS, WEIGHTS, TYPE_SCALE, FONT_FAMILY, FLUID_TYPE } from './typography';
import { EASING, DURATION, TIMING, SPRING_CONFIGS, TRANSITIONS, transition } from './motion';

/**
 * Unified brand object containing all design tokens
 */
export const BRAND = {
  // Tagline
  tagline: 'Events detected. You protected.',

  // Colors
  colors: {
    primary: PRIMARY,
    semantic: SEMANTIC,
    neutral: NEUTRAL,
    gradients: GRADIENTS,
    severity: SEVERITY_COLORS,
  },

  // Typography
  typography: {
    fonts: FONTS,
    weights: WEIGHTS,
    scale: TYPE_SCALE,
    family: FONT_FAMILY,
    fluid: FLUID_TYPE,
  },

  // Motion
  motion: {
    easing: EASING,
    duration: DURATION,
    timing: TIMING,
    springs: SPRING_CONFIGS,
    transitions: TRANSITIONS,
  },

  // Utilities
  utils: {
    rgba,
    transition,
  },
} as const;

// Default export
export default BRAND;
