/**
 * Eventinel Brand Colors
 *
 * @see docs/BRAND_GUIDELINES.md for full color system documentation
 */

// Primary brand colors
export const PRIMARY = {
  DEFAULT: '#9333EA',
  dark: '#7C3AED',
  light: '#A855F7',
} as const;

// Semantic/alert colors
export const SEMANTIC = {
  alert: '#DC2626', // High severity, critical alerts
  warning: '#F59E0B', // Medium severity, caution
  safe: '#22C55E', // Low severity, all clear, success
  info: '#3B82F6', // Informational, user location
} as const;

// Neutral/dark mode colors
export const NEUTRAL = {
  dark: '#09090B', // Primary background
  darkElevated: '#18181B', // Cards, elevated surfaces
  darkBorder: '#27272A', // Borders, dividers
  textPrimary: '#FAFAFA', // Primary text
  textMuted: '#A1A1AA', // Secondary text
} as const;

// Gradients
export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #9333EA 0%, #7C3AED 50%, #6366F1 100%)',
  alert: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
  text: 'linear-gradient(135deg, #FFFFFF 0%, #A1A1AA 100%)',
} as const;

// CSS custom properties format (for Tailwind/CSS)
export const CSS_VARIABLES = {
  '--primary': PRIMARY.DEFAULT,
  '--primary-dark': PRIMARY.dark,
  '--primary-light': PRIMARY.light,
  '--alert': SEMANTIC.alert,
  '--warning': SEMANTIC.warning,
  '--safe': SEMANTIC.safe,
  '--info': SEMANTIC.info,
  '--dark': NEUTRAL.dark,
  '--dark-elevated': NEUTRAL.darkElevated,
  '--dark-border': NEUTRAL.darkBorder,
  '--text': NEUTRAL.textPrimary,
  '--text-muted': NEUTRAL.textMuted,
} as const;

// Tailwind-compatible color object
export const TAILWIND_COLORS = {
  primary: {
    DEFAULT: PRIMARY.DEFAULT,
    dark: PRIMARY.dark,
    light: PRIMARY.light,
  },
  alert: SEMANTIC.alert,
  warning: SEMANTIC.warning,
  safe: SEMANTIC.safe,
  info: SEMANTIC.info,
  dark: {
    DEFAULT: NEUTRAL.dark,
    elevated: NEUTRAL.darkElevated,
    border: NEUTRAL.darkBorder,
  },
} as const;

// Severity color mapping
export const SEVERITY_COLORS = {
  critical: SEMANTIC.alert,
  high: '#F97316', // Orange-500
  medium: SEMANTIC.warning,
  low: SEMANTIC.safe,
  info: SEMANTIC.info,
} as const;

// RGB values for transparency operations
export const RGB = {
  primary: { r: 147, g: 51, b: 234 },
  alert: { r: 220, g: 38, b: 38 },
  warning: { r: 245, g: 158, b: 11 },
  safe: { r: 34, g: 197, b: 94 },
  info: { r: 59, g: 130, b: 246 },
} as const;

/**
 * Get RGBA color string with alpha
 */
export function rgba(color: keyof typeof RGB, alpha: number): string {
  const { r, g, b } = RGB[color];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
