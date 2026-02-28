/**
 * SeverityBadge Component Tests
 *
 * Tests the severity indicator pill component including:
 * - Rendering for all 5 severity levels (1-5)
 * - Correct color mapping from SEVERITY_COLORS
 * - Size variants (sm, md)
 * - Background color with transparency
 * - Text display and styling
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { SeverityBadge } from '../../../components/incident/SeverityBadge';
import { SEVERITY_COLORS } from '@lib/nostr/config';
import type { Severity } from '@lib/nostr/config';

// =============================================================================
// TEST SETUP
// =============================================================================

describe('SeverityBadge', () => {
  // All valid severity levels
  const allSeverityLevels: Severity[] = [1, 2, 3, 4, 5];

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { getByText } = render(<SeverityBadge severity={3} />);
      expect(getByText('3')).toBeTruthy();
    });

    it('displays the severity number as text', () => {
      const { getByText } = render(<SeverityBadge severity={4} />);
      expect(getByText('4')).toBeTruthy();
    });

    it('renders a View container', () => {
      const { toJSON } = render(<SeverityBadge severity={2} />);
      const tree = toJSON();
      expect(tree).not.toBeNull();
      expect(tree?.type).toBe('View');
    });
  });

  // =============================================================================
  // SEVERITY LEVEL TESTS
  // =============================================================================

  describe('Severity Levels', () => {
    it.each(allSeverityLevels)('renders severity level %i correctly', (level) => {
      const { getByText } = render(<SeverityBadge severity={level} />);
      expect(getByText(String(level))).toBeTruthy();
    });

    it('renders severity 1 (Info - lowest)', () => {
      const { getByText } = render(<SeverityBadge severity={1} />);
      expect(getByText('1')).toBeTruthy();
    });

    it('renders severity 2 (Low)', () => {
      const { getByText } = render(<SeverityBadge severity={2} />);
      expect(getByText('2')).toBeTruthy();
    });

    it('renders severity 3 (Medium)', () => {
      const { getByText } = render(<SeverityBadge severity={3} />);
      expect(getByText('3')).toBeTruthy();
    });

    it('renders severity 4 (High)', () => {
      const { getByText } = render(<SeverityBadge severity={4} />);
      expect(getByText('4')).toBeTruthy();
    });

    it('renders severity 5 (Critical - highest)', () => {
      const { getByText } = render(<SeverityBadge severity={5} />);
      expect(getByText('5')).toBeTruthy();
    });
  });

  // =============================================================================
  // COLOR MAPPING TESTS
  // =============================================================================

  // Helper to get color from style (handles both flat and array styles)
  const getStyleColor = (style: any): string | undefined => {
    if (Array.isArray(style)) {
      const colorStyle = style.find((s: any) => s?.color !== undefined);
      return colorStyle?.color;
    }
    return style?.color;
  };

  // Helper to get background color from style
  const getStyleBackgroundColor = (style: any): string | undefined => {
    if (Array.isArray(style)) {
      const bgStyle = style.find((s: any) => s?.backgroundColor !== undefined);
      return bgStyle?.backgroundColor;
    }
    return style?.backgroundColor;
  };

  describe('Color Mapping', () => {
    it('applies correct text color for severity 1 (gray)', () => {
      const { getByText } = render(<SeverityBadge severity={1} />);
      const textElement = getByText('1');
      const color = getStyleColor(textElement.props.style);
      expect(color).toBe(SEVERITY_COLORS[1]);
    });

    it('applies correct text color for severity 2 (blue)', () => {
      const { getByText } = render(<SeverityBadge severity={2} />);
      const textElement = getByText('2');
      const color = getStyleColor(textElement.props.style);
      expect(color).toBe(SEVERITY_COLORS[2]);
    });

    it('applies correct text color for severity 3 (amber)', () => {
      const { getByText } = render(<SeverityBadge severity={3} />);
      const textElement = getByText('3');
      const color = getStyleColor(textElement.props.style);
      expect(color).toBe(SEVERITY_COLORS[3]);
    });

    it('applies correct text color for severity 4 (orange-red)', () => {
      const { getByText } = render(<SeverityBadge severity={4} />);
      const textElement = getByText('4');
      const color = getStyleColor(textElement.props.style);
      expect(color).toBe(SEVERITY_COLORS[4]);
    });

    it('applies correct text color for severity 5 (red)', () => {
      const { getByText } = render(<SeverityBadge severity={5} />);
      const textElement = getByText('5');
      const color = getStyleColor(textElement.props.style);
      expect(color).toBe(SEVERITY_COLORS[5]);
    });

    it('applies background color with 20% opacity for severity 1', () => {
      const { toJSON } = render(<SeverityBadge severity={1} />);
      const tree = toJSON();
      const bgColor = getStyleBackgroundColor(tree?.props.style);
      expect(bgColor).toBe(`${SEVERITY_COLORS[1]}20`);
    });

    it('applies background color with 20% opacity for severity 5', () => {
      const { toJSON } = render(<SeverityBadge severity={5} />);
      const tree = toJSON();
      const bgColor = getStyleBackgroundColor(tree?.props.style);
      expect(bgColor).toBe(`${SEVERITY_COLORS[5]}20`);
    });

    it.each(allSeverityLevels)(
      'uses SEVERITY_COLORS[%i] for text color',
      (level) => {
        const { getByText } = render(<SeverityBadge severity={level} />);
        const textElement = getByText(String(level));
        const color = getStyleColor(textElement.props.style);
        expect(color).toBe(SEVERITY_COLORS[level]);
      }
    );

    it.each(allSeverityLevels)(
      'uses SEVERITY_COLORS[%i] with 20 suffix for background',
      (level) => {
        const { toJSON } = render(<SeverityBadge severity={level} />);
        const tree = toJSON();
        const bgColor = getStyleBackgroundColor(tree?.props.style);
        expect(bgColor).toBe(`${SEVERITY_COLORS[level]}20`);
      }
    );
  });

  // =============================================================================
  // SIZE VARIANT TESTS
  // =============================================================================

  // Helper to get dimension from style (gets the last defined value - the one that wins in cascade)
  const getStyleDimension = (style: any, prop: string): number | undefined => {
    if (Array.isArray(style)) {
      // Reverse to find the last (winning) value
      const reversed = [...style].reverse();
      const found = reversed.find((s: any) => s?.[prop] !== undefined);
      return found?.[prop];
    }
    return style?.[prop];
  };

  // Helper to get font size from style
  const getStyleFontSize = (style: any): number | undefined => {
    if (Array.isArray(style)) {
      // Reverse to find the last (winning) value
      const reversed = [...style].reverse();
      const found = reversed.find((s: any) => s?.fontSize !== undefined);
      return found?.fontSize;
    }
    return style?.fontSize;
  };

  describe('Size Variants', () => {
    describe('Medium size (default)', () => {
      it('uses medium size by default', () => {
        const { toJSON } = render(<SeverityBadge severity={3} />);
        const tree = toJSON();
        const width = getStyleDimension(tree?.props.style, 'width');
        expect(width).toBe(28);
      });

      it('has height of 28 for medium size', () => {
        const { toJSON } = render(<SeverityBadge severity={3} />);
        const tree = toJSON();
        const height = getStyleDimension(tree?.props.style, 'height');
        expect(height).toBe(28);
      });

      it('has borderRadius of 14 for medium size', () => {
        const { toJSON } = render(<SeverityBadge severity={3} />);
        const tree = toJSON();
        const borderRadius = getStyleDimension(tree?.props.style, 'borderRadius');
        expect(borderRadius).toBe(14);
      });

      it('explicit size="md" matches default behavior', () => {
        const { toJSON: toJSONDefault } = render(<SeverityBadge severity={3} />);
        const { toJSON: toJSONExplicit } = render(
          <SeverityBadge severity={3} size="md" />
        );

        const defaultTree = toJSONDefault();
        const explicitTree = toJSONExplicit();

        // Both should have the same width
        const defaultWidth = getStyleDimension(defaultTree?.props.style, 'width');
        const explicitWidth = getStyleDimension(explicitTree?.props.style, 'width');
        expect(defaultWidth).toBe(explicitWidth);
      });
    });

    describe('Small size', () => {
      it('applies small size styles when size="sm"', () => {
        const { toJSON } = render(<SeverityBadge severity={3} size="sm" />);
        const tree = toJSON();
        const width = getStyleDimension(tree?.props.style, 'width');
        expect(width).toBe(22);
      });

      it('has height of 22 for small size', () => {
        const { toJSON } = render(<SeverityBadge severity={3} size="sm" />);
        const tree = toJSON();
        const height = getStyleDimension(tree?.props.style, 'height');
        expect(height).toBe(22);
      });

      it('has borderRadius of 11 for small size', () => {
        const { toJSON } = render(<SeverityBadge severity={3} size="sm" />);
        const tree = toJSON();
        const borderRadius = getStyleDimension(tree?.props.style, 'borderRadius');
        expect(borderRadius).toBe(11);
      });

      it('applies smaller font size for small variant', () => {
        const { getByText } = render(<SeverityBadge severity={3} size="sm" />);
        const textElement = getByText('3');
        const fontSize = getStyleFontSize(textElement.props.style);
        expect(fontSize).toBe(12);
      });

      it('medium size uses font size 14', () => {
        const { getByText } = render(<SeverityBadge severity={3} size="md" />);
        const textElement = getByText('3');
        const fontSize = getStyleFontSize(textElement.props.style);
        expect(fontSize).toBe(14);
      });
    });

    describe('Size comparison', () => {
      it('small badge is smaller than medium badge', () => {
        const { toJSON: toJSONSmall } = render(
          <SeverityBadge severity={3} size="sm" />
        );
        const { toJSON: toJSONMedium } = render(
          <SeverityBadge severity={3} size="md" />
        );

        const smallTree = toJSONSmall();
        const mediumTree = toJSONMedium();

        const smallWidth = getStyleDimension(smallTree?.props.style, 'width');
        const mediumWidth = getStyleDimension(mediumTree?.props.style, 'width');

        expect(smallWidth).toBeLessThan(mediumWidth!);
      });
    });
  });

  // =============================================================================
  // TEXT STYLING TESTS
  // =============================================================================

  // Helper to get style property value
  const getStyleProp = (style: any, prop: string): any => {
    if (Array.isArray(style)) {
      const found = style.find((s: any) => s?.[prop] !== undefined);
      return found?.[prop];
    }
    return style?.[prop];
  };

  describe('Text Styling', () => {
    it('uses bold font weight', () => {
      const { getByText } = render(<SeverityBadge severity={3} />);
      const textElement = getByText('3');
      const fontWeight = getStyleProp(textElement.props.style, 'fontWeight');
      expect(fontWeight).toBe('700');
    });

    it('centers text horizontally', () => {
      const { toJSON } = render(<SeverityBadge severity={3} />);
      const tree = toJSON();
      const alignItems = getStyleProp(tree?.props.style, 'alignItems');
      expect(alignItems).toBe('center');
    });

    it('centers text vertically', () => {
      const { toJSON } = render(<SeverityBadge severity={3} />);
      const tree = toJSON();
      const justifyContent = getStyleProp(tree?.props.style, 'justifyContent');
      expect(justifyContent).toBe('center');
    });
  });

  // =============================================================================
  // VISUAL CONSISTENCY TESTS
  // =============================================================================

  describe('Visual Consistency', () => {
    it('maintains circular shape (width equals height)', () => {
      const { toJSON } = render(<SeverityBadge severity={3} />);
      const tree = toJSON();

      const width = getStyleDimension(tree?.props.style, 'width');
      const height = getStyleDimension(tree?.props.style, 'height');

      expect(width).toBe(height);
    });

    it('borderRadius is half of width for perfect circle', () => {
      const { toJSON } = render(<SeverityBadge severity={3} />);
      const tree = toJSON();

      const width = getStyleDimension(tree?.props.style, 'width');
      const borderRadius = getStyleDimension(tree?.props.style, 'borderRadius');

      expect(borderRadius).toBe(width! / 2);
    });

    it('small size maintains circular shape', () => {
      const { toJSON } = render(<SeverityBadge severity={3} size="sm" />);
      const tree = toJSON();

      const width = getStyleDimension(tree?.props.style, 'width');
      const height = getStyleDimension(tree?.props.style, 'height');

      expect(width).toBe(height);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('renders consistently when re-rendered with same props', () => {
      const { getByText, rerender } = render(<SeverityBadge severity={3} />);

      expect(getByText('3')).toBeTruthy();

      rerender(<SeverityBadge severity={3} />);

      expect(getByText('3')).toBeTruthy();
    });

    it('updates correctly when severity changes', () => {
      const { getByText, rerender, queryByText } = render(
        <SeverityBadge severity={3} />
      );

      expect(getByText('3')).toBeTruthy();

      rerender(<SeverityBadge severity={5} />);

      expect(queryByText('3')).toBeNull();
      expect(getByText('5')).toBeTruthy();
    });

    it('updates color when severity changes', () => {
      const { getByText, rerender } = render(<SeverityBadge severity={1} />);

      let textElement = getByText('1');
      let color = getStyleColor(textElement.props.style);
      expect(color).toBe(SEVERITY_COLORS[1]);

      rerender(<SeverityBadge severity={5} />);

      textElement = getByText('5');
      color = getStyleColor(textElement.props.style);
      expect(color).toBe(SEVERITY_COLORS[5]);
    });

    it('updates size when size prop changes', () => {
      const { toJSON, rerender } = render(
        <SeverityBadge severity={3} size="md" />
      );

      let tree = toJSON();
      let width = getStyleDimension(tree?.props.style, 'width');
      expect(width).toBe(28);

      rerender(<SeverityBadge severity={3} size="sm" />);

      tree = toJSON();
      width = getStyleDimension(tree?.props.style, 'width');
      expect(width).toBe(22);
    });
  });

  // =============================================================================
  // BRAND COLOR VERIFICATION
  // =============================================================================

  describe('Brand Color Verification', () => {
    it('severity 5 uses critical red (#DC2626)', () => {
      expect(SEVERITY_COLORS[5]).toBe('#DC2626');
    });

    it('severity 4 uses high orange-red (#EA580C)', () => {
      expect(SEVERITY_COLORS[4]).toBe('#EA580C');
    });

    it('severity 3 uses medium amber (#F59E0B)', () => {
      expect(SEVERITY_COLORS[3]).toBe('#F59E0B');
    });

    it('severity 2 uses low blue (#3B82F6)', () => {
      expect(SEVERITY_COLORS[2]).toBe('#3B82F6');
    });

    it('severity 1 uses info gray (#6B7280)', () => {
      expect(SEVERITY_COLORS[1]).toBe('#6B7280');
    });
  });
});
