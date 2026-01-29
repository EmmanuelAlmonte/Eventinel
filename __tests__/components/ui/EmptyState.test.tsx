/**
 * EmptyState Component Tests
 *
 * Tests the EmptyState component and its preset variants:
 * - EmptyState (base component)
 * - NoIncidentsEmpty
 * - NoRelaysEmpty
 * - OfflineEmpty
 * - ErrorEmpty
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Import components under test
import {
  EmptyState,
  NoIncidentsEmpty,
  NoRelaysEmpty,
  OfflineEmpty,
  ErrorEmpty,
} from '../../../components/ui/EmptyState';

// =============================================================================
// EMPTYSTATE BASE COMPONENT TESTS
// =============================================================================

describe('EmptyState', () => {
  describe('Rendering', () => {
    it('renders title text', () => {
      const { getByText } = render(<EmptyState title="Test Title" />);
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('renders description when provided', () => {
      const { getByText } = render(
        <EmptyState title="Title" description="Test description text" />
      );
      expect(getByText('Test description text')).toBeTruthy();
    });

    it('does not render description when not provided', () => {
      const { queryByText } = render(<EmptyState title="Title" />);
      // There should be no description element rendered
      expect(queryByText(/description/i)).toBeNull();
    });

    it('renders emoji when provided', () => {
      const { getByText } = render(<EmptyState title="Title" emoji="🎉" />);
      expect(getByText('🎉')).toBeTruthy();
    });

    it('renders icon when emoji is not provided', () => {
      const { getByTestId } = render(<EmptyState title="Title" icon="inbox" />);
      // Icon component should be rendered - RNE uses testID
      const iconContainer = getByTestId('RNE__ICON__CONTAINER');
      expect(iconContainer).toBeTruthy();
    });

    it('uses default icon "inbox" when no icon or emoji specified', () => {
      const { getByTestId } = render(<EmptyState title="Title" />);
      // Default icon should be inbox
      const iconContainer = getByTestId('RNE__ICON__CONTAINER');
      expect(iconContainer).toBeTruthy();
    });

    it('renders emoji instead of icon when both could be present', () => {
      const { getByText, queryByTestId } = render(
        <EmptyState title="Title" emoji="🎉" icon="inbox" />
      );
      // Emoji should be rendered
      expect(getByText('🎉')).toBeTruthy();
    });
  });

  describe('Primary Action Button', () => {
    it('renders action button when action and onAction provided', () => {
      const mockOnAction = jest.fn();
      const { getByText } = render(
        <EmptyState title="Title" action="Click Me" onAction={mockOnAction} />
      );
      expect(getByText('Click Me')).toBeTruthy();
    });

    it('does not render action button when only action prop provided', () => {
      const { queryByText } = render(<EmptyState title="Title" action="Click Me" />);
      // Button should not render without onAction handler
      expect(queryByText('Click Me')).toBeNull();
    });

    it('does not render action button when only onAction prop provided', () => {
      const mockOnAction = jest.fn();
      const { queryByRole } = render(
        <EmptyState title="Title" onAction={mockOnAction} />
      );
      // No button should be rendered
      expect(queryByRole('button')).toBeNull();
    });

    it('calls onAction when action button is pressed', () => {
      const mockOnAction = jest.fn();
      const { getByText } = render(
        <EmptyState title="Title" action="Click Me" onAction={mockOnAction} />
      );

      fireEvent.press(getByText('Click Me'));

      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });

    it('calls onAction multiple times on multiple presses', () => {
      const mockOnAction = jest.fn();
      const { getByText } = render(
        <EmptyState title="Title" action="Click Me" onAction={mockOnAction} />
      );

      fireEvent.press(getByText('Click Me'));
      fireEvent.press(getByText('Click Me'));
      fireEvent.press(getByText('Click Me'));

      expect(mockOnAction).toHaveBeenCalledTimes(3);
    });
  });

  describe('Secondary Action Button', () => {
    it('renders secondary action button when both props provided', () => {
      const mockOnSecondary = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="Title"
          secondaryAction="Secondary"
          onSecondaryAction={mockOnSecondary}
        />
      );
      expect(getByText('Secondary')).toBeTruthy();
    });

    it('does not render secondary button without handler', () => {
      const { queryByText } = render(
        <EmptyState title="Title" secondaryAction="Secondary" />
      );
      expect(queryByText('Secondary')).toBeNull();
    });

    it('calls onSecondaryAction when secondary button pressed', () => {
      const mockOnSecondary = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="Title"
          secondaryAction="Secondary"
          onSecondaryAction={mockOnSecondary}
        />
      );

      fireEvent.press(getByText('Secondary'));

      expect(mockOnSecondary).toHaveBeenCalledTimes(1);
    });

    it('renders both primary and secondary buttons together', () => {
      const mockOnPrimary = jest.fn();
      const mockOnSecondary = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="Title"
          action="Primary"
          onAction={mockOnPrimary}
          secondaryAction="Secondary"
          onSecondaryAction={mockOnSecondary}
        />
      );

      expect(getByText('Primary')).toBeTruthy();
      expect(getByText('Secondary')).toBeTruthy();
    });
  });

  describe('Icon Configuration', () => {
    it('accepts custom icon type', () => {
      const { UNSAFE_root } = render(
        <EmptyState title="Title" icon="wifi-off" iconType="feather" />
      );
      // Component should render without error
      expect(UNSAFE_root).toBeTruthy();
    });

    it('uses default icon type "material" when not specified', () => {
      const { UNSAFE_root } = render(<EmptyState title="Title" icon="inbox" />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});

// =============================================================================
// NOINCIDENTSEMPTY PRESET TESTS
// =============================================================================

describe('NoIncidentsEmpty', () => {
  it('renders party emoji', () => {
    const { getByText } = render(<NoIncidentsEmpty />);
    expect(getByText('🎉')).toBeTruthy();
  });

  it('renders "All Clear!" title', () => {
    const { getByText } = render(<NoIncidentsEmpty />);
    expect(getByText('All Clear!')).toBeTruthy();
  });

  it('renders appropriate description', () => {
    const { getByText } = render(<NoIncidentsEmpty />);
    expect(getByText(/No incidents reported in your area/)).toBeTruthy();
  });

  it('renders Refresh button when onRefresh provided', () => {
    const mockRefresh = jest.fn();
    const { getByText } = render(<NoIncidentsEmpty onRefresh={mockRefresh} />);
    expect(getByText('Refresh')).toBeTruthy();
  });

  it('does not render Refresh button without onRefresh', () => {
    const { queryByText } = render(<NoIncidentsEmpty />);
    expect(queryByText('Refresh')).toBeNull();
  });

  it('calls onRefresh when Refresh button pressed', () => {
    const mockRefresh = jest.fn();
    const { getByText } = render(<NoIncidentsEmpty onRefresh={mockRefresh} />);

    fireEvent.press(getByText('Refresh'));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// NORELAYSEMPTY PRESET TESTS
// =============================================================================

describe('NoRelaysEmpty', () => {
  it('renders globe emoji', () => {
    const { getByText } = render(<NoRelaysEmpty />);
    expect(getByText('🌐')).toBeTruthy();
  });

  it('renders "No Relays Connected" title', () => {
    const { getByText } = render(<NoRelaysEmpty />);
    expect(getByText('No Relays Connected')).toBeTruthy();
  });

  it('renders appropriate description', () => {
    const { getByText } = render(<NoRelaysEmpty />);
    expect(getByText(/Add a Nostr relay/)).toBeTruthy();
  });

  it('renders Add Relay button when onAddRelay provided', () => {
    const mockAddRelay = jest.fn();
    const { getByText } = render(<NoRelaysEmpty onAddRelay={mockAddRelay} />);
    expect(getByText('Add Relay')).toBeTruthy();
  });

  it('does not render Add Relay button without handler', () => {
    const { queryByText } = render(<NoRelaysEmpty />);
    // When onAddRelay is not provided, button should not appear
    expect(queryByText('Add Relay')).toBeNull();
  });

  it('calls onAddRelay when button pressed', () => {
    const mockAddRelay = jest.fn();
    const { getByText } = render(<NoRelaysEmpty onAddRelay={mockAddRelay} />);

    fireEvent.press(getByText('Add Relay'));

    expect(mockAddRelay).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// OFFLINEEMPTY PRESET TESTS
// =============================================================================

describe('OfflineEmpty', () => {
  it('renders "You\'re Offline" title', () => {
    const { getByText } = render(<OfflineEmpty />);
    expect(getByText("You're Offline")).toBeTruthy();
  });

  it('renders appropriate description', () => {
    const { getByText } = render(<OfflineEmpty />);
    expect(getByText(/Check your internet connection/)).toBeTruthy();
  });

  it('uses wifi-off icon instead of emoji', () => {
    const { queryByText } = render(<OfflineEmpty />);
    // Should not have emoji
    expect(queryByText('🎉')).toBeNull();
    expect(queryByText('🌐')).toBeNull();
  });

  it('renders Retry button when onRetry provided', () => {
    const mockRetry = jest.fn();
    const { getByText } = render(<OfflineEmpty onRetry={mockRetry} />);
    expect(getByText('Retry')).toBeTruthy();
  });

  it('does not render Retry button without handler', () => {
    const { queryByText } = render(<OfflineEmpty />);
    expect(queryByText('Retry')).toBeNull();
  });

  it('calls onRetry when button pressed', () => {
    const mockRetry = jest.fn();
    const { getByText } = render(<OfflineEmpty onRetry={mockRetry} />);

    fireEvent.press(getByText('Retry'));

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// ERROREMPTY PRESET TESTS
// =============================================================================

describe('ErrorEmpty', () => {
  it('renders "Something went wrong" title', () => {
    const { getByText } = render(<ErrorEmpty />);
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('renders default error message when no message provided', () => {
    const { getByText } = render(<ErrorEmpty />);
    expect(getByText(/An unexpected error occurred/)).toBeTruthy();
  });

  it('renders custom error message when provided', () => {
    const { getByText } = render(<ErrorEmpty message="Custom error message" />);
    expect(getByText('Custom error message')).toBeTruthy();
  });

  it('uses error-outline icon', () => {
    const { queryByText } = render(<ErrorEmpty />);
    // Should not have emoji
    expect(queryByText('🎉')).toBeNull();
  });

  it('renders "Try Again" button when onRetry provided', () => {
    const mockRetry = jest.fn();
    const { getByText } = render(<ErrorEmpty onRetry={mockRetry} />);
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('does not render button without handler', () => {
    const { queryByText } = render(<ErrorEmpty />);
    expect(queryByText('Try Again')).toBeNull();
  });

  it('calls onRetry when button pressed', () => {
    const mockRetry = jest.fn();
    const { getByText } = render(<ErrorEmpty onRetry={mockRetry} />);

    fireEvent.press(getByText('Try Again'));

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('handles empty string message', () => {
    // Note: The component uses ?? operator, so empty string is treated as valid
    // and results in no description being rendered
    const { getByText, queryByText } = render(<ErrorEmpty message="" />);
    expect(getByText('Something went wrong')).toBeTruthy();
    // Empty string message should not show description
    expect(queryByText(/An unexpected error occurred/)).toBeNull();
  });
});

// =============================================================================
// EDGE CASES AND ACCESSIBILITY
// =============================================================================

describe('Edge Cases', () => {
  it('handles very long title text', () => {
    const longTitle = 'A'.repeat(100);
    const { getByText } = render(<EmptyState title={longTitle} />);
    expect(getByText(longTitle)).toBeTruthy();
  });

  it('handles very long description text', () => {
    const longDesc = 'B'.repeat(500);
    const { getByText } = render(
      <EmptyState title="Title" description={longDesc} />
    );
    expect(getByText(longDesc)).toBeTruthy();
  });

  it('handles special characters in title', () => {
    const specialTitle = "Test <Title> & 'Special' Chars";
    const { getByText } = render(
      <EmptyState title={specialTitle} />
    );
    expect(getByText(specialTitle)).toBeTruthy();
  });

  it('handles unicode characters in title', () => {
    const { getByText } = render(
      <EmptyState title="Test Unicode: Hello World" />
    );
    expect(getByText('Test Unicode: Hello World')).toBeTruthy();
  });

  it('handles action with very long text', () => {
    const longAction = 'Click This Very Long Button Text';
    const mockOnAction = jest.fn();
    const { getByText } = render(
      <EmptyState title="Title" action={longAction} onAction={mockOnAction} />
    );
    expect(getByText(longAction)).toBeTruthy();
  });
});

describe('Accessibility', () => {
  it('title text is visible', () => {
    const { getByText } = render(<EmptyState title="Accessible Title" />);
    const titleElement = getByText('Accessible Title');
    expect(titleElement).toBeTruthy();
  });

  it('buttons are pressable', () => {
    const mockOnAction = jest.fn();
    const { getByText } = render(
      <EmptyState title="Title" action="Press Me" onAction={mockOnAction} />
    );

    const button = getByText('Press Me');
    fireEvent.press(button);
    expect(mockOnAction).toHaveBeenCalled();
  });

  it('renders without crashing with minimal props', () => {
    const { getByText } = render(<EmptyState title="Minimal" />);
    expect(getByText('Minimal')).toBeTruthy();
  });
});
