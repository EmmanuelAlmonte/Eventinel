/**
 * Eventinel Brand Motion & Animation
 *
 * Principles:
 * 1. Purposeful — Animation should communicate, not decorate
 * 2. Quick — Most transitions 150-300ms
 * 3. Smooth — Use ease-out for entrances, ease-in for exits
 * 4. Subtle — Don't distract from critical safety information
 *
 * @see docs/BRAND_GUIDELINES.md for full motion documentation
 */

// Easing functions
export const EASING = {
  /** Ease-out for entrances and hover states */
  out: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  /** Ease-in for exits */
  in: 'cubic-bezier(0.4, 0.0, 1, 1)',
  /** Ease-in-out for transitions */
  inOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  /** Linear for loading spinners */
  linear: 'linear',
} as const;

// Duration constants (in milliseconds)
export const DURATION = {
  instant: 0,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 500,
  slowest: 1000,
} as const;

// Animation timing presets
export const TIMING = {
  hover: {
    duration: DURATION.fast,
    easing: EASING.out,
  },
  transition: {
    duration: DURATION.slow,
    easing: EASING.inOut,
  },
  modal: {
    open: { duration: DURATION.normal, easing: EASING.out },
    close: { duration: DURATION.fast, easing: EASING.in },
  },
  toast: {
    enter: { duration: DURATION.normal, easing: EASING.out },
    exit: { duration: DURATION.fast, easing: EASING.in },
  },
  alertPulse: {
    duration: 2000,
    easing: EASING.inOut,
  },
  loadingSpinner: {
    duration: DURATION.slowest,
    easing: EASING.linear,
  },
} as const;

// Keyframe animations
export const KEYFRAMES = {
  /** Alert entrance animation */
  alertEnter: `
    @keyframes alert-enter {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  /** Pulse animation for alert indicators */
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.1); }
    }
  `,
  /** Background glow movement */
  glowMove: `
    @keyframes glow-move {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(5%, 5%); }
    }
  `,
  /** Fade in animation */
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
  /** Slide in from right */
  slideInRight: `
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(100%); }
      to { opacity: 1; transform: translateX(0); }
    }
  `,
  /** Slide out to right */
  slideOutRight: `
    @keyframes slideOutRight {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(100%); }
    }
  `,
} as const;

// CSS animation strings
export const ANIMATIONS = {
  pulse: 'pulse 2s ease-in-out infinite',
  glowMove: 'glow-move 20s ease-in-out infinite',
  alertEnter: 'alert-enter 200ms ease-out',
  fadeIn: 'fadeIn 300ms ease',
  slideInRight: 'slideInRight 200ms ease-out',
  slideOutRight: 'slideOutRight 150ms ease-in',
} as const;

// CSS transition helpers
export const TRANSITIONS = {
  /** Standard hover transition */
  hover: `all ${DURATION.fast}ms ${EASING.out}`,
  /** Page/section transition */
  page: `all ${DURATION.slow}ms ${EASING.inOut}`,
  /** Color-only transition */
  color: `color ${DURATION.fast}ms ${EASING.out}`,
  /** Transform transition (for hover effects) */
  transform: `transform ${DURATION.normal}ms ${EASING.out}`,
  /** Box-shadow transition */
  shadow: `box-shadow ${DURATION.normal}ms ${EASING.out}`,
  /** Multiple properties */
  multiple: (...props: string[]) =>
    props.map((p) => `${p} ${DURATION.fast}ms ${EASING.out}`).join(', '),
} as const;

// Video-compatible spring configs
export const SPRING_CONFIGS = {
  /** Quick, snappy animations */
  snappy: { damping: 200, mass: 0.5, stiffness: 400 },
  /** Standard UI animations */
  default: { damping: 100, mass: 1, stiffness: 200 },
  /** Gentle, smooth animations */
  gentle: { damping: 80, mass: 1.5, stiffness: 150 },
  /** Bouncy animations */
  bouncy: { damping: 50, mass: 1, stiffness: 300 },
} as const;

/**
 * Get CSS transition string
 */
export function transition(
  property: string = 'all',
  duration: keyof typeof DURATION = 'fast',
  easing: keyof typeof EASING = 'out'
): string {
  return `${property} ${DURATION[duration]}ms ${EASING[easing]}`;
}

/**
 * Get combined keyframes CSS
 */
export function getAllKeyframes(): string {
  return Object.values(KEYFRAMES).join('\n');
}
