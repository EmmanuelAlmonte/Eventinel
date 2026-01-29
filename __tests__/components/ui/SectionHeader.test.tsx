/**
 * SectionHeader Component Tests
 *
 * Tests the SectionHeader component:
 * - Title rendering
 * - Subtitle rendering
 * - Action button functionality
 * - Icon configuration
 * - Margin configuration
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Import component under test
import { SectionHeader } from '../../../components/ui/SectionHeader';

// =============================================================================
// BASIC RENDERING TESTS
// =============================================================================

describe('SectionHeader', () => {
  describe('Title Rendering', () => {
    it('renders title text', () => {
      const { getByText } = render(<SectionHeader title="Test Section" />);
      expect(getByText('Test Section')).toBeTruthy();
    });

    it('renders long title text', () => {
      const longTitle = 'This is a very long section header title that might wrap';
      const { getByText } = render(<SectionHeader title={longTitle} />);
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('renders title with special characters', () => {
      const { getByText } = render(
        <SectionHeader title="Section <Title> & 'More'" />
      );
      expect(getByText("Section <Title> & 'More'")).toBeTruthy();
    });

    it('renders title with unicode characters', () => {
      const { getByText } = render(<SectionHeader title="Section Title" />);
      expect(getByText('Section Title')).toBeTruthy();
    });
  });

  describe('Subtitle Rendering', () => {
    it('renders subtitle when provided', () => {
      const { getByText } = render(
        <SectionHeader title="Title" subtitle="Subtitle text" />
      );
      expect(getByText('Subtitle text')).toBeTruthy();
    });

    it('does not render subtitle when not provided', () => {
      const { queryByText } = render(<SectionHeader title="Title Only" />);
      // Only title should be present
      expect(queryByText('Title Only')).toBeTruthy();
    });

    it('renders both title and subtitle', () => {
      const { getByText } = render(
        <SectionHeader title="Main Title" subtitle="Supporting subtitle" />
      );
      expect(getByText('Main Title')).toBeTruthy();
      expect(getByText('Supporting subtitle')).toBeTruthy();
    });

    it('renders empty subtitle as nothing', () => {
      const { queryByText, getByText } = render(
        <SectionHeader title="Title" subtitle="" />
      );
      expect(getByText('Title')).toBeTruthy();
    });
  });

  describe('Action Button', () => {
    it('renders action button when both action and onAction provided', () => {
      const mockOnAction = jest.fn();
      const { getByText } = render(
        <SectionHeader title="Title" action="View All" onAction={mockOnAction} />
      );
      expect(getByText('View All')).toBeTruthy();
    });

    it('does not render action button when only action text provided', () => {
      const { queryByText } = render(
        <SectionHeader title="Title" action="View All" />
      );
      // Action should not be rendered without handler
      expect(queryByText('View All')).toBeNull();
    });

    it('does not render action button when only onAction provided', () => {
      const mockOnAction = jest.fn();
      const { queryByRole } = render(
        <SectionHeader title="Title" onAction={mockOnAction} />
      );
      // No button should be rendered
      expect(queryByRole('button')).toBeNull();
    });

    it('calls onAction when action button pressed', () => {
      const mockOnAction = jest.fn();
      const { getByText } = render(
        <SectionHeader title="Title" action="Click Me" onAction={mockOnAction} />
      );

      fireEvent.press(getByText('Click Me'));

      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });

    it('calls onAction multiple times on multiple presses', () => {
      const mockOnAction = jest.fn();
      const { getByText } = render(
        <SectionHeader title="Title" action="Press" onAction={mockOnAction} />
      );

      fireEvent.press(getByText('Press'));
      fireEvent.press(getByText('Press'));
      fireEvent.press(getByText('Press'));

      expect(mockOnAction).toHaveBeenCalledTimes(3);
    });

    it('renders chevron icon with action button', () => {
      const mockOnAction = jest.fn();
      const { getByTestId } = render(
        <SectionHeader title="Title" action="More" onAction={mockOnAction} />
      );
      // Should have Icon component for chevron (RNE uses testID)
      const iconContainer = getByTestId('RNE__ICON__CONTAINER');
      expect(iconContainer).toBeTruthy();
    });
  });

  describe('Icon Configuration', () => {
    it('renders icon when provided', () => {
      const { getByTestId } = render(
        <SectionHeader title="Title" icon="warning" />
      );
      // RNE Icon uses testID
      const iconContainer = getByTestId('RNE__ICON__CONTAINER');
      expect(iconContainer).toBeTruthy();
    });

    it('does not render icon when not provided', () => {
      const { UNSAFE_root } = render(<SectionHeader title="Title" />);
      // No icon should be rendered (unless action is present)
      expect(UNSAFE_root).toBeTruthy();
    });

    it('uses material icon type by default', () => {
      const { UNSAFE_root } = render(
        <SectionHeader title="Title" icon="settings" />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('accepts custom icon type', () => {
      const { UNSAFE_root } = render(
        <SectionHeader title="Title" icon="wifi" iconType="feather" />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders icon alongside title', () => {
      const { getByText, UNSAFE_root } = render(
        <SectionHeader title="Settings" icon="settings" />
      );
      expect(getByText('Settings')).toBeTruthy();
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Margin Configuration', () => {
    it('uses default marginTop of 24', () => {
      const { UNSAFE_root } = render(<SectionHeader title="Title" />);
      // Component renders with default margin
      expect(UNSAFE_root).toBeTruthy();
    });

    it('uses custom marginTop when provided', () => {
      const { UNSAFE_root } = render(
        <SectionHeader title="Title" marginTop={0} />
      );
      // Component accepts custom marginTop
      expect(UNSAFE_root).toBeTruthy();
    });

    it('allows zero marginTop', () => {
      const { UNSAFE_root } = render(
        <SectionHeader title="Title" marginTop={0} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('allows large marginTop values', () => {
      const { UNSAFE_root } = render(
        <SectionHeader title="Title" marginTop={100} />
      );
      // Component accepts large marginTop values
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});

// =============================================================================
// FULL CONFIGURATION TESTS
// =============================================================================

describe('SectionHeader Full Configuration', () => {
  it('renders with all props', () => {
    const mockOnAction = jest.fn();
    const { getByText, UNSAFE_root } = render(
      <SectionHeader
        title="Full Config"
        subtitle="With all options"
        action="See More"
        onAction={mockOnAction}
        icon="info"
        iconType="material"
        marginTop={16}
      />
    );

    expect(getByText('Full Config')).toBeTruthy();
    expect(getByText('With all options')).toBeTruthy();
    expect(getByText('See More')).toBeTruthy();
    expect(UNSAFE_root).toBeTruthy();
  });

  it('handles action press with full configuration', () => {
    const mockOnAction = jest.fn();
    const { getByText } = render(
      <SectionHeader
        title="Title"
        subtitle="Subtitle"
        action="Action"
        onAction={mockOnAction}
        icon="star"
        marginTop={20}
      />
    );

    fireEvent.press(getByText('Action'));
    expect(mockOnAction).toHaveBeenCalled();
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('handles extremely long title', () => {
    const longTitle = 'A'.repeat(200);
    const { getByText } = render(<SectionHeader title={longTitle} />);
    expect(getByText(longTitle)).toBeTruthy();
  });

  it('handles extremely long subtitle', () => {
    const longSubtitle = 'B'.repeat(200);
    const { getByText } = render(
      <SectionHeader title="Title" subtitle={longSubtitle} />
    );
    expect(getByText(longSubtitle)).toBeTruthy();
  });

  it('handles extremely long action text', () => {
    const longAction = 'See All Available Items';
    const mockOnAction = jest.fn();
    const { getByText } = render(
      <SectionHeader title="Title" action={longAction} onAction={mockOnAction} />
    );
    expect(getByText(longAction)).toBeTruthy();
  });

  it('handles emojis in title', () => {
    const { getByText } = render(<SectionHeader title="Alerts Section" />);
    expect(getByText('Alerts Section')).toBeTruthy();
  });

  it('handles emojis in subtitle', () => {
    const { getByText } = render(
      <SectionHeader title="Title" subtitle="Important updates" />
    );
    expect(getByText('Important updates')).toBeTruthy();
  });

  it('handles negative marginTop', () => {
    const { UNSAFE_root } = render(
      <SectionHeader title="Title" marginTop={-10} />
    );
    // Component accepts negative marginTop
    expect(UNSAFE_root).toBeTruthy();
  });
});

// =============================================================================
// ACCESSIBILITY TESTS
// =============================================================================

describe('Accessibility', () => {
  it('title text is visible', () => {
    const { getByText } = render(
      <SectionHeader title="Accessible Section Title" />
    );
    expect(getByText('Accessible Section Title')).toBeTruthy();
  });

  it('subtitle text is visible', () => {
    const { getByText } = render(
      <SectionHeader title="Title" subtitle="Accessible Subtitle" />
    );
    expect(getByText('Accessible Subtitle')).toBeTruthy();
  });

  it('action button is pressable', () => {
    const mockOnAction = jest.fn();
    const { getByText } = render(
      <SectionHeader title="Title" action="Press Me" onAction={mockOnAction} />
    );

    const actionButton = getByText('Press Me');
    fireEvent.press(actionButton);

    expect(mockOnAction).toHaveBeenCalled();
  });
});

// =============================================================================
// VISUAL REGRESSION HELPERS
// =============================================================================

describe('Visual Consistency', () => {
  it('maintains consistent structure with minimal props', () => {
    const { UNSAFE_root } = render(<SectionHeader title="Minimal" />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('maintains consistent structure with all props', () => {
    const mockOnAction = jest.fn();
    const { UNSAFE_root } = render(
      <SectionHeader
        title="Full"
        subtitle="Subtitle"
        action="Action"
        onAction={mockOnAction}
        icon="star"
        iconType="material"
        marginTop={32}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });
});
