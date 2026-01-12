/**
 * Eventinel Brand Typography
 *
 * @see docs/BRAND_GUIDELINES.md for full typography documentation
 */

// Font families
export const FONTS = {
  /** Primary font for all UI and marketing */
  primary: 'Inter',
  /** Monospace font for code, data, technical information */
  mono: 'JetBrains Mono',
} as const;

// Font weights
export const WEIGHTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

// Type scale (in pixels)
export const TYPE_SCALE = {
  display: {
    size: { min: 48, max: 80 },
    weight: WEIGHTS.extrabold,
    lineHeight: 1.1,
    usage: 'Hero headlines',
  },
  h1: {
    size: { min: 36, max: 48 },
    weight: WEIGHTS.extrabold,
    lineHeight: 1.2,
    usage: 'Page titles',
  },
  h2: {
    size: { min: 28, max: 36 },
    weight: WEIGHTS.bold,
    lineHeight: 1.25,
    usage: 'Section headers',
  },
  h3: {
    size: { min: 20, max: 24 },
    weight: WEIGHTS.bold,
    lineHeight: 1.3,
    usage: 'Card titles',
  },
  h4: {
    size: { min: 16, max: 18 },
    weight: WEIGHTS.semibold,
    lineHeight: 1.4,
    usage: 'Subsections',
  },
  body: {
    size: 16,
    weight: WEIGHTS.regular,
    lineHeight: 1.6,
    usage: 'Paragraphs',
  },
  bodySmall: {
    size: 14,
    weight: WEIGHTS.regular,
    lineHeight: 1.5,
    usage: 'Secondary text',
  },
  caption: {
    size: 12,
    weight: WEIGHTS.medium,
    lineHeight: 1.4,
    usage: 'Labels, timestamps',
  },
  mono: {
    size: 14,
    weight: WEIGHTS.medium,
    lineHeight: 1.5,
    usage: 'Code, data',
  },
} as const;

// Google Fonts import URL
export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap';

// Font loading HTML link tag
export const FONT_LINK_HTML = `<link href="${GOOGLE_FONTS_URL}" rel="stylesheet">`;

// CSS font-family declarations
export const FONT_FAMILY = {
  primary: `'${FONTS.primary}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  mono: `'${FONTS.mono}', 'SF Mono', Monaco, 'Cascadia Code', monospace`,
} as const;

// Fluid typography CSS (clamp-based)
export const FLUID_TYPE = {
  display: 'clamp(3rem, 8vw, 5rem)',
  h1: 'clamp(2.25rem, 5vw, 3rem)',
  h2: 'clamp(1.75rem, 4vw, 2.25rem)',
  h3: 'clamp(1.25rem, 3vw, 1.5rem)',
} as const;

/**
 * Get CSS for a type scale entry
 */
export function getTypeCss(scale: keyof typeof TYPE_SCALE): string {
  const entry = TYPE_SCALE[scale];
  const size =
    typeof entry.size === 'number'
      ? `${entry.size}px`
      : FLUID_TYPE[scale as keyof typeof FLUID_TYPE] || `${entry.size.min}px`;

  return `
    font-size: ${size};
    font-weight: ${entry.weight};
    line-height: ${entry.lineHeight};
  `.trim();
}
