/**
 * useAppTheme Hook Tests
 *
 * Tests the theme management hook including:
 * - Theme colors access
 * - Dark/light mode detection
 * - Mode toggling functionality
 * - Color token consistency
 *
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react-native';

// Mock @rneui/themed before importing the hook
const mockSetMode = jest.fn();
let mockMode = 'dark';

jest.mock('@rneui/themed', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: mockMode === 'dark' ? '#09090B' : '#FFFFFF',
        searchBg: mockMode === 'dark' ? '#18181B' : '#F4F4F5',
        grey0: mockMode === 'dark' ? '#FAFAFA' : '#18181B',
        grey2: mockMode === 'dark' ? '#A1A1AA' : '#71717A',
        grey5: mockMode === 'dark' ? '#3F3F46' : '#D4D4D8',
        primary: '#9333EA',
        success: '#22C55E',
        error: '#DC2626',
        warning: '#F59E0B',
      },
    },
  }),
  useThemeMode: () => ({
    mode: mockMode,
    setMode: mockSetMode,
  }),
}));

// Import after mocking
import { useAppTheme } from '../../hooks/useAppTheme';
import { PRIMARY, SEMANTIC, SEVERITY_COLORS } from '../../lib/brand/colors';

// =============================================================================
// TEST SETUP
// =============================================================================

describe('useAppTheme', () => {
  beforeEach(() => {
    mockMode = 'dark';
    mockSetMode.mockClear();
  });

  // =============================================================================
  // INITIAL STATE TESTS
  // =============================================================================

  describe('Initial State', () => {
    it('returns theme object from RNEUI', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.theme).toBeDefined();
      expect(result.current.theme.colors).toBeDefined();
    });

    it('returns colors object with semantic tokens', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors).toBeDefined();
      expect(result.current.colors.background).toBeDefined();
      expect(result.current.colors.text).toBeDefined();
      expect(result.current.colors.primary).toBeDefined();
    });

    it('returns mode as string', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(typeof result.current.mode).toBe('string');
      expect(['light', 'dark']).toContain(result.current.mode);
    });

    it('returns isDark as boolean', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(typeof result.current.isDark).toBe('boolean');
    });

    it('returns setMode function', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(typeof result.current.setMode).toBe('function');
    });

    it('returns toggleMode function', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(typeof result.current.toggleMode).toBe('function');
    });
  });

  // =============================================================================
  // DARK MODE TESTS
  // =============================================================================

  describe('Dark Mode', () => {
    beforeEach(() => {
      mockMode = 'dark';
    });

    it('isDark is true when mode is dark', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.isDark).toBe(true);
    });

    it('returns dark background color', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.background).toBe('#09090B');
    });

    it('returns dark surface color', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.surface).toBe('#18181B');
    });

    it('returns dark surfaceAlt color', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.surfaceAlt).toBe('#27272A');
    });

    it('returns light text color in dark mode', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.text).toBe('#FAFAFA');
    });

    it('returns dark textInverse color', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.textInverse).toBe('#18181B');
    });

    it('returns dark borderMuted color', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.borderMuted).toBe('#3F3F46');
    });
  });

  // =============================================================================
  // LIGHT MODE TESTS
  // =============================================================================

  describe('Light Mode', () => {
    beforeEach(() => {
      mockMode = 'light';
    });

    it('isDark is false when mode is light', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.isDark).toBe(false);
    });

    it('returns light background color', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.background).toBe('#FFFFFF');
    });

    it('returns light surfaceAlt color', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.surfaceAlt).toBe('#F4F4F5');
    });

    it('returns dark text color in light mode', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.text).toBe('#18181B');
    });

    it('returns light textInverse color', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.textInverse).toBe('#FAFAFA');
    });

    it('returns light borderMuted color', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.borderMuted).toBe('#D4D4D8');
    });
  });

  // =============================================================================
  // MODE TOGGLING TESTS
  // =============================================================================

  describe('Mode Toggling', () => {
    it('toggleMode calls setMode with light when in dark mode', () => {
      mockMode = 'dark';
      const { result } = renderHook(() => useAppTheme());

      act(() => {
        result.current.toggleMode();
      });

      expect(mockSetMode).toHaveBeenCalledWith('light');
    });

    it('toggleMode calls setMode with dark when in light mode', () => {
      mockMode = 'light';
      const { result } = renderHook(() => useAppTheme());

      act(() => {
        result.current.toggleMode();
      });

      expect(mockSetMode).toHaveBeenCalledWith('dark');
    });

    it('setMode can be called directly', () => {
      const { result } = renderHook(() => useAppTheme());

      act(() => {
        result.current.setMode('light');
      });

      expect(mockSetMode).toHaveBeenCalledWith('light');
    });
  });

  // =============================================================================
  // BRAND COLOR TESTS
  // =============================================================================

  describe('Brand Colors', () => {
    it('includes primary brand color', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.primary).toBe('#9333EA');
    });

    it('includes primaryDark from PRIMARY constant', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.primaryDark).toBe(PRIMARY.dark);
    });

    it('includes primaryLight from PRIMARY constant', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.primaryLight).toBe(PRIMARY.light);
    });
  });

  // =============================================================================
  // SEMANTIC COLOR TESTS
  // =============================================================================

  describe('Semantic Colors', () => {
    it('includes success color', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.success).toBe('#22C55E');
    });

    it('includes error color', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.error).toBe('#DC2626');
    });

    it('includes warning color', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.warning).toBe('#F59E0B');
    });

    it('includes info color from SEMANTIC constant', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.info).toBe(SEMANTIC.info);
    });
  });

  // =============================================================================
  // SEVERITY COLORS TESTS
  // =============================================================================

  describe('Severity Colors', () => {
    it('includes severity color mapping', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.severity).toBeDefined();
    });

    it('severity colors match SEVERITY_COLORS constant', () => {
      const { result } = renderHook(() => useAppTheme());
      expect(result.current.colors.severity).toBe(SEVERITY_COLORS);
    });

    it('severity colors have all named levels', () => {
      const { result } = renderHook(() => useAppTheme());
      // SEVERITY_COLORS from brand/colors uses string keys
      expect(result.current.colors.severity.critical).toBeDefined();
      expect(result.current.colors.severity.high).toBeDefined();
      expect(result.current.colors.severity.medium).toBeDefined();
      expect(result.current.colors.severity.low).toBeDefined();
      expect(result.current.colors.severity.info).toBeDefined();
    });
  });

  // =============================================================================
  // COLOR TOKEN CONSISTENCY TESTS
  // =============================================================================

  describe('Color Token Consistency', () => {
    it('all background tokens are defined', () => {
      const { result } = renderHook(() => useAppTheme());
      const { colors } = result.current;

      expect(colors.background).toBeDefined();
      expect(colors.surface).toBeDefined();
      expect(colors.surfaceAlt).toBeDefined();
    });

    it('all text tokens are defined', () => {
      const { result } = renderHook(() => useAppTheme());
      const { colors } = result.current;

      expect(colors.text).toBeDefined();
      expect(colors.textMuted).toBeDefined();
      expect(colors.textInverse).toBeDefined();
    });

    it('all border tokens are defined', () => {
      const { result } = renderHook(() => useAppTheme());
      const { colors } = result.current;

      expect(colors.border).toBeDefined();
      expect(colors.borderMuted).toBeDefined();
    });

    it('all brand tokens are defined', () => {
      const { result } = renderHook(() => useAppTheme());
      const { colors } = result.current;

      expect(colors.primary).toBeDefined();
      expect(colors.primaryDark).toBeDefined();
      expect(colors.primaryLight).toBeDefined();
    });

    it('all semantic tokens are defined', () => {
      const { result } = renderHook(() => useAppTheme());
      const { colors } = result.current;

      expect(colors.success).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.info).toBeDefined();
    });
  });

  // =============================================================================
  // STABILITY TESTS
  // =============================================================================

  describe('Stability', () => {
    it('returns stable references for colors object structure', () => {
      const { result, rerender } = renderHook(() => useAppTheme());

      const colorKeys = Object.keys(result.current.colors);
      rerender();
      const colorKeysAfterRerender = Object.keys(result.current.colors);

      expect(colorKeys).toEqual(colorKeysAfterRerender);
    });

    it('returns same theme shape across rerenders', () => {
      const { result, rerender } = renderHook(() => useAppTheme());

      const keys = Object.keys(result.current);
      rerender();
      const keysAfterRerender = Object.keys(result.current);

      expect(keys).toEqual(keysAfterRerender);
    });
  });
});
