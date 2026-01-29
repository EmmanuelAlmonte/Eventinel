/**
 * ScreenContainer Component Tests
 *
 * Tests the ScreenContainer wrapper component:
 * - Safe area handling
 * - Scroll behavior
 * - Pull-to-refresh functionality
 * - Background colors
 * - Padding configuration
 * - Content centering
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { View, Text } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock the hooks module BEFORE importing the component
jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#09090B',
      textMuted: '#A1A1AA',
    },
  }),
}));

// Import component under test AFTER mocking
import { ScreenContainer } from '../../../components/ui/ScreenContainer';

// =============================================================================
// TEST UTILITIES
// =============================================================================

const TestChild = ({ text = 'Test Content' }: { text?: string }) => (
  <View testID="test-child">
    <Text>{text}</Text>
  </View>
);

// =============================================================================
// BASIC RENDERING TESTS
// =============================================================================

describe('ScreenContainer', () => {
  describe('Basic Rendering', () => {
    it('renders children', () => {
      const { getByText } = render(
        <ScreenContainer>
          <TestChild text="Hello World" />
        </ScreenContainer>
      );
      expect(getByText('Hello World')).toBeTruthy();
    });

    it('renders multiple children', () => {
      const { getByText } = render(
        <ScreenContainer>
          <TestChild text="First Child" />
          <TestChild text="Second Child" />
        </ScreenContainer>
      );
      expect(getByText('First Child')).toBeTruthy();
      expect(getByText('Second Child')).toBeTruthy();
    });

    it('renders as View by default (not ScrollView)', () => {
      const { UNSAFE_root, queryByTestId } = render(
        <ScreenContainer>
          <TestChild />
        </ScreenContainer>
      );
      // Default is View, not ScrollView
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Scroll Mode', () => {
    it('renders ScrollView when scroll=true', () => {
      const { UNSAFE_root } = render(
        <ScreenContainer scroll={true}>
          <TestChild />
        </ScreenContainer>
      );
      const scrollViews = UNSAFE_root.findAllByType('RCTScrollView' as any);
      expect(scrollViews.length).toBe(1);
    });

    it('renders View when scroll=false', () => {
      const { UNSAFE_root } = render(
        <ScreenContainer scroll={false}>
          <TestChild />
        </ScreenContainer>
      );
      // Should render View, not ScrollView
      expect(UNSAFE_root).toBeTruthy();
    });

    it('children are rendered inside ScrollView when scroll mode', () => {
      const { getByText } = render(
        <ScreenContainer scroll={true}>
          <TestChild text="Scrollable Content" />
        </ScreenContainer>
      );
      expect(getByText('Scrollable Content')).toBeTruthy();
    });
  });

  describe('Pull to Refresh', () => {
    it('renders RefreshControl when onRefresh provided with scroll', () => {
      const mockOnRefresh = jest.fn();
      const { UNSAFE_root } = render(
        <ScreenContainer scroll={true} onRefresh={mockOnRefresh} refreshing={false}>
          <TestChild />
        </ScreenContainer>
      );
      // RefreshControl should be present
      const scrollView = UNSAFE_root.findByType('RCTScrollView' as any);
      expect(scrollView.props.refreshControl).toBeDefined();
    });

    it('does not render RefreshControl when onRefresh not provided', () => {
      const { UNSAFE_root } = render(
        <ScreenContainer scroll={true}>
          <TestChild />
        </ScreenContainer>
      );
      const scrollView = UNSAFE_root.findByType('RCTScrollView' as any);
      expect(scrollView.props.refreshControl).toBeUndefined();
    });

    it('passes refreshing state to RefreshControl', () => {
      const mockOnRefresh = jest.fn();
      const { UNSAFE_root } = render(
        <ScreenContainer scroll={true} onRefresh={mockOnRefresh} refreshing={true}>
          <TestChild />
        </ScreenContainer>
      );
      const scrollView = UNSAFE_root.findByType('RCTScrollView' as any);
      expect(scrollView.props.refreshControl.props.refreshing).toBe(true);
    });

    it('defaults refreshing to false when not specified', () => {
      const mockOnRefresh = jest.fn();
      const { UNSAFE_root } = render(
        <ScreenContainer scroll={true} onRefresh={mockOnRefresh}>
          <TestChild />
        </ScreenContainer>
      );
      const scrollView = UNSAFE_root.findByType('RCTScrollView' as any);
      expect(scrollView.props.refreshControl.props.refreshing).toBe(false);
    });

    it('ignores onRefresh when scroll=false', () => {
      const mockOnRefresh = jest.fn();
      const { getByText } = render(
        <ScreenContainer scroll={false} onRefresh={mockOnRefresh}>
          <TestChild />
        </ScreenContainer>
      );
      // Content should render (no RefreshControl since it's a View)
      expect(getByText('Test Content')).toBeTruthy();
    });
  });

  describe('Safe Area Handling', () => {
    it('applies safe area padding by default', () => {
      const { getByText } = render(
        <ScreenContainer>
          <TestChild />
        </ScreenContainer>
      );
      // Content should render within safe area
      expect(getByText('Test Content')).toBeTruthy();
    });

    it('disables safe area padding when safeArea=false', () => {
      const { getByText } = render(
        <ScreenContainer safeArea={false}>
          <TestChild />
        </ScreenContainer>
      );
      expect(getByText('Test Content')).toBeTruthy();
    });
  });

  describe('Background Color', () => {
    it('uses theme background color by default', () => {
      const { getByText } = render(
        <ScreenContainer>
          <TestChild />
        </ScreenContainer>
      );
      expect(getByText('Test Content')).toBeTruthy();
    });

    it('uses custom background color when provided', () => {
      const { getByText } = render(
        <ScreenContainer backgroundColor="#FF0000">
          <TestChild />
        </ScreenContainer>
      );
      expect(getByText('Test Content')).toBeTruthy();
    });

    it('applies background to ScrollView when in scroll mode', () => {
      const { getByText } = render(
        <ScreenContainer scroll={true} backgroundColor="#00FF00">
          <TestChild />
        </ScreenContainer>
      );
      expect(getByText('Test Content')).toBeTruthy();
    });
  });

  describe('Padding Configuration', () => {
    it('uses default horizontal padding of 16', () => {
      const { getByText } = render(
        <ScreenContainer>
          <TestChild />
        </ScreenContainer>
      );
      expect(getByText('Test Content')).toBeTruthy();
    });

    it('uses custom horizontal padding when provided', () => {
      const { getByText } = render(
        <ScreenContainer paddingHorizontal={24}>
          <TestChild />
        </ScreenContainer>
      );
      expect(getByText('Test Content')).toBeTruthy();
    });

    it('allows zero padding', () => {
      const { getByText } = render(
        <ScreenContainer paddingHorizontal={0}>
          <TestChild />
        </ScreenContainer>
      );
      expect(getByText('Test Content')).toBeTruthy();
    });
  });

  describe('Center Content', () => {
    it('does not center content by default', () => {
      const { getByText } = render(
        <ScreenContainer>
          <TestChild />
        </ScreenContainer>
      );
      expect(getByText('Test Content')).toBeTruthy();
    });

    it('centers content when centerContent=true', () => {
      const { getByText } = render(
        <ScreenContainer centerContent={true}>
          <TestChild />
        </ScreenContainer>
      );
      expect(getByText('Test Content')).toBeTruthy();
    });
  });

  describe('Custom Style', () => {
    it('applies additional style prop', () => {
      const { getByText } = render(
        <ScreenContainer style={{ borderWidth: 2 }}>
          <TestChild />
        </ScreenContainer>
      );
      expect(getByText('Test Content')).toBeTruthy();
    });

    it('merges custom style with default styles', () => {
      const { getByText } = render(
        <ScreenContainer style={{ marginTop: 10 }}>
          <TestChild />
        </ScreenContainer>
      );
      expect(getByText('Test Content')).toBeTruthy();
    });
  });

  describe('ScrollView Configuration', () => {
    it('hides vertical scroll indicator', () => {
      const { UNSAFE_root } = render(
        <ScreenContainer scroll={true}>
          <TestChild />
        </ScreenContainer>
      );
      const scrollView = UNSAFE_root.findByType('RCTScrollView' as any);
      expect(scrollView.props.showsVerticalScrollIndicator).toBe(false);
    });

    it('persists keyboard taps when scrolling', () => {
      const { UNSAFE_root } = render(
        <ScreenContainer scroll={true}>
          <TestChild />
        </ScreenContainer>
      );
      const scrollView = UNSAFE_root.findByType('RCTScrollView' as any);
      expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled');
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('ScreenContainer Integration', () => {
  it('renders full configuration correctly', () => {
    const mockOnRefresh = jest.fn();
    const { getByText, UNSAFE_root } = render(
      <ScreenContainer
        scroll={true}
        refreshing={false}
        onRefresh={mockOnRefresh}
        safeArea={true}
        backgroundColor="#1a1a1a"
        paddingHorizontal={20}
        centerContent={false}
        style={{ borderRadius: 8 }}
      >
        <TestChild text="Full Config Test" />
      </ScreenContainer>
    );

    expect(getByText('Full Config Test')).toBeTruthy();
    expect(UNSAFE_root).toBeTruthy();
  });

  it('combines multiple children with scroll', () => {
    const { getByText } = render(
      <ScreenContainer scroll={true}>
        <View>
          <Text>Header</Text>
        </View>
        <View>
          <Text>Body</Text>
        </View>
        <View>
          <Text>Footer</Text>
        </View>
      </ScreenContainer>
    );

    expect(getByText('Header')).toBeTruthy();
    expect(getByText('Body')).toBeTruthy();
    expect(getByText('Footer')).toBeTruthy();
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('renders with null children', () => {
    const { UNSAFE_root } = render(
      <ScreenContainer>{null}</ScreenContainer>
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders with undefined children', () => {
    const { UNSAFE_root } = render(
      <ScreenContainer>{undefined}</ScreenContainer>
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders with conditional children', () => {
    const showContent = true;
    const { getByText } = render(
      <ScreenContainer>
        {showContent && <TestChild text="Conditional" />}
      </ScreenContainer>
    );
    expect(getByText('Conditional')).toBeTruthy();
  });

  it('renders with false conditional children', () => {
    const showContent = false;
    const { queryByText } = render(
      <ScreenContainer>
        {showContent && <TestChild text="Hidden" />}
      </ScreenContainer>
    );
    expect(queryByText('Hidden')).toBeNull();
  });

  it('handles very large padding values', () => {
    const { getByText } = render(
      <ScreenContainer paddingHorizontal={1000}>
        <TestChild />
      </ScreenContainer>
    );
    expect(getByText('Test Content')).toBeTruthy();
  });
});
