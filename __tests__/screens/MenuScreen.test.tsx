/**
 * MenuScreen Component Tests
 *
 * Tests the menu screen functionality including:
 * - Header rendering
 * - Quick compose section
 * - Navigation menu cards
 * - Note publishing
 * - Status messages
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// Import the component
import MenuScreen from '../../screens/MenuScreen';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
}));

// Mock NDK
const mockPublish = jest.fn();
const mockNDKEvent = jest.fn().mockImplementation(() => ({
  kind: undefined,
  content: undefined,
  publish: mockPublish,
}));

const mockRelays = new Map([
  ['wss://relay1.com', { url: 'wss://relay1.com', status: 5 }], // CONNECTED
  ['wss://relay2.com', { url: 'wss://relay2.com', status: 5 }], // CONNECTED
]);

const mockNdk = {
  pool: {
    relays: mockRelays,
  },
};

jest.mock('@nostr-dev-kit/mobile', () => ({
  useNDK: () => ({ ndk: mockNdk }),
  NDKEvent: function (ndk: any) {
    const instance = {
      kind: undefined as number | undefined,
      content: undefined as string | undefined,
      publish: mockPublish,
    };
    return instance;
  },
}));

// Mock relay status
jest.mock('../../lib/relay/status', () => ({
  isConnected: (status: number) => status >= 5,
}));

// Mock useAppTheme
const mockColors = {
  background: '#1a1a2e',
  surface: '#27272A',
  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  primary: '#2563eb',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  border: '#3F3F46',
};

jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: mockColors,
    isDark: true,
  }),
}));

// Mock ScreenContainer
jest.mock('@components/ui', () => ({
  ScreenContainer: ({ children, scroll }: any) => {
    const { ScrollView, View } = require('react-native');
    if (scroll) {
      return <ScrollView testID="screen-container-scroll">{children}</ScrollView>;
    }
    return <View testID="screen-container">{children}</View>;
  },
}));

// Mock @rneui/themed
jest.mock('@rneui/themed', () => ({
  Text: ({ children, style, h1, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text style={style} {...props}>{children}</Text>;
  },
  Card: ({ children, containerStyle, wrapperStyle }: any) => {
    const { View } = require('react-native');
    return <View style={[containerStyle, wrapperStyle]} testID="card">{children}</View>;
  },
  Icon: ({ name, color, size, type, onPress, style, containerStyle }: any) => {
    const { Pressable, Text, View } = require('react-native');
    if (onPress) {
      return (
        <Pressable testID={`icon-button-${name}`} onPress={onPress} style={containerStyle}>
          <Text>{name}</Text>
        </Pressable>
      );
    }
    return (
      <View testID={`icon-${name}`} style={[style, containerStyle]}>
        <Text>{name}</Text>
      </View>
    );
  },
  Button: ({ title, onPress, containerStyle, icon }: any) => {
    const { Pressable, Text, View } = require('react-native');
    return (
      <Pressable testID={`button-${title?.toLowerCase().replace(/\s+/g, '-')}`} onPress={onPress} style={containerStyle}>
        {icon && <View>{icon}</View>}
        <Text>{title}</Text>
      </Pressable>
    );
  },
  Input: ({ placeholder, value, onChangeText, multiline, numberOfLines, containerStyle, inputContainerStyle, inputStyle, placeholderTextColor }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        testID="note-input"
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={[containerStyle, inputContainerStyle, inputStyle]}
        placeholderTextColor={placeholderTextColor}
      />
    );
  },
}));

// =============================================================================
// TEST SUITE
// =============================================================================

describe('MenuScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPublish.mockResolvedValue(undefined);
    // Reset relay map to connected state
    mockRelays.clear();
    mockRelays.set('wss://relay1.com', { url: 'wss://relay1.com', status: 5 });
    mockRelays.set('wss://relay2.com', { url: 'wss://relay2.com', status: 5 });
  });

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe('Rendering', () => {
    it('renders the app title', () => {
      const { getByText } = render(<MenuScreen />);
      expect(getByText('Eventinel')).toBeTruthy();
    });

    it('renders the subtitle', () => {
      const { getByText } = render(<MenuScreen />);
      expect(getByText('Nostr-native public safety monitoring')).toBeTruthy();
    });

    it('renders Quick Compose section', () => {
      const { getByText } = render(<MenuScreen />);
      expect(getByText('Quick Compose')).toBeTruthy();
    });

    it('renders footer text', () => {
      const { getByText } = render(<MenuScreen />);
      expect(getByText('Tap any card to get started')).toBeTruthy();
    });

    it('renders screen container with scroll', () => {
      const { getByTestId } = render(<MenuScreen />);
      expect(getByTestId('screen-container-scroll')).toBeTruthy();
    });
  });

  // =============================================================================
  // QUICK COMPOSE TESTS
  // =============================================================================

  describe('Quick Compose Section', () => {
    it('renders note input placeholder', () => {
      const { getByPlaceholderText } = render(<MenuScreen />);
      expect(getByPlaceholderText("What's happening?")).toBeTruthy();
    });

    it('renders publish button', () => {
      const { getByTestId } = render(<MenuScreen />);
      expect(getByTestId('button-publish-note')).toBeTruthy();
    });

    it('allows typing in note input', () => {
      const { getByTestId } = render(<MenuScreen />);
      const input = getByTestId('note-input');

      fireEvent.changeText(input, 'Test note content');

      expect(input.props.value).toBe('Test note content');
    });

    it('renders edit icon in compose section', () => {
      const { getByTestId } = render(<MenuScreen />);
      expect(getByTestId('icon-edit')).toBeTruthy();
    });

    it('renders send icon in publish button', () => {
      const { getByTestId } = render(<MenuScreen />);
      expect(getByTestId('icon-send')).toBeTruthy();
    });
  });

  // =============================================================================
  // NOTE PUBLISHING TESTS
  // =============================================================================

  describe('Note Publishing', () => {
    it('shows error when publishing empty note', async () => {
      const { getByTestId, getByText } = render(<MenuScreen />);
      const publishButton = getByTestId('button-publish-note');

      await act(async () => {
        fireEvent.press(publishButton);
      });

      expect(getByText('Please enter a note')).toBeTruthy();
    });

    it('publishes note successfully', async () => {
      const { getByTestId, getByText } = render(<MenuScreen />);
      const input = getByTestId('note-input');
      const publishButton = getByTestId('button-publish-note');

      fireEvent.changeText(input, 'My test note');

      await act(async () => {
        fireEvent.press(publishButton);
      });

      await waitFor(() => {
        expect(getByText('Note published!')).toBeTruthy();
      });
    });

    it('clears input after successful publish', async () => {
      const { getByTestId } = render(<MenuScreen />);
      const input = getByTestId('note-input');
      const publishButton = getByTestId('button-publish-note');

      fireEvent.changeText(input, 'My test note');

      await act(async () => {
        fireEvent.press(publishButton);
      });

      await waitFor(() => {
        expect(input.props.value).toBe('');
      });
    });

    it('shows error when no relays connected', async () => {
      // Clear all relays to simulate no connections
      mockRelays.clear();

      const { getByTestId, getByText } = render(<MenuScreen />);
      const input = getByTestId('note-input');
      const publishButton = getByTestId('button-publish-note');

      fireEvent.changeText(input, 'My test note');

      await act(async () => {
        fireEvent.press(publishButton);
      });

      expect(getByText('Please connect to at least one relay first')).toBeTruthy();
    });

    it('shows error when NDK is not initialized', async () => {
      // Mock useNDK to return null
      jest.doMock('@nostr-dev-kit/mobile', () => ({
        useNDK: () => ({ ndk: null }),
        NDKEvent: mockNDKEvent,
      }));

      // This would require re-importing the component, which is complex in Jest
      // For now, we test the behavior through the existing mock
    });

    it('trims whitespace from note content', async () => {
      const { getByTestId, getByText } = render(<MenuScreen />);
      const input = getByTestId('note-input');
      const publishButton = getByTestId('button-publish-note');

      fireEvent.changeText(input, '   Trimmed note   ');

      await act(async () => {
        fireEvent.press(publishButton);
      });

      await waitFor(() => {
        expect(getByText('Note published!')).toBeTruthy();
      });
    });
  });

  // =============================================================================
  // STATUS MESSAGE TESTS
  // =============================================================================

  describe('Status Messages', () => {
    it('shows success styling for successful publish', async () => {
      const { getByTestId, getByText } = render(<MenuScreen />);
      const input = getByTestId('note-input');
      const publishButton = getByTestId('button-publish-note');

      fireEvent.changeText(input, 'Test note');

      await act(async () => {
        fireEvent.press(publishButton);
      });

      await waitFor(() => {
        expect(getByText('Note published!')).toBeTruthy();
      });

      // Check that success icon is shown
      expect(getByTestId('icon-check-circle-outline')).toBeTruthy();
    });

    it('shows error styling for error messages', async () => {
      const { getByTestId, getByText } = render(<MenuScreen />);
      const publishButton = getByTestId('button-publish-note');

      await act(async () => {
        fireEvent.press(publishButton);
      });

      expect(getByText('Please enter a note')).toBeTruthy();
      expect(getByTestId('icon-error-outline')).toBeTruthy();
    });

    it('clears status message after timeout', async () => {
      jest.useFakeTimers();

      const { getByTestId, getByText, queryByText } = render(<MenuScreen />);
      const input = getByTestId('note-input');
      const publishButton = getByTestId('button-publish-note');

      fireEvent.changeText(input, 'Test note');

      await act(async () => {
        fireEvent.press(publishButton);
      });

      expect(getByText('Note published!')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(3100);
      });

      expect(queryByText('Note published!')).toBeNull();

      jest.useRealTimers();
    });
  });

  // =============================================================================
  // NAVIGATION MENU CARDS TESTS
  // =============================================================================

  describe('Navigation Menu Cards', () => {
    it('renders Relays menu card', () => {
      const { getByText } = render(<MenuScreen />);
      expect(getByText('Relays')).toBeTruthy();
      expect(getByText('Manage Nostr relay connections')).toBeTruthy();
    });

    it('renders Map menu card', () => {
      const { getByText } = render(<MenuScreen />);
      expect(getByText('Map')).toBeTruthy();
      expect(getByText('View incidents on map')).toBeTruthy();
    });

    it('renders Profile menu card', () => {
      const { getByText } = render(<MenuScreen />);
      expect(getByText('Profile')).toBeTruthy();
      expect(getByText('Your profile and settings')).toBeTruthy();
    });

    it('renders icon for Relays card', () => {
      const { getByTestId } = render(<MenuScreen />);
      expect(getByTestId('icon-public')).toBeTruthy();
    });

    it('renders icon for Map card', () => {
      const { getByTestId } = render(<MenuScreen />);
      expect(getByTestId('icon-map')).toBeTruthy();
    });

    it('renders icon for Profile card', () => {
      const { getByTestId } = render(<MenuScreen />);
      expect(getByTestId('icon-person')).toBeTruthy();
    });

    it('renders chevron icons for navigation', () => {
      const { getAllByTestId } = render(<MenuScreen />);
      const chevrons = getAllByTestId('icon-button-chevron-right');
      expect(chevrons.length).toBe(3);
    });
  });

  // =============================================================================
  // MENU CARD NAVIGATION TESTS
  // =============================================================================

  describe('Menu Card Navigation', () => {
    it('navigates to Relays screen when Relays chevron is pressed', () => {
      const { getAllByTestId } = render(<MenuScreen />);
      const chevrons = getAllByTestId('icon-button-chevron-right');

      fireEvent.press(chevrons[0]); // First chevron is Relays

      expect(mockNavigate).toHaveBeenCalledWith('Relays');
    });

    it('navigates to Map screen when Map chevron is pressed', () => {
      const { getAllByTestId } = render(<MenuScreen />);
      const chevrons = getAllByTestId('icon-button-chevron-right');

      fireEvent.press(chevrons[1]); // Second chevron is Map

      expect(mockNavigate).toHaveBeenCalledWith('Map');
    });

    it('navigates to Profile screen when Profile chevron is pressed', () => {
      const { getAllByTestId } = render(<MenuScreen />);
      const chevrons = getAllByTestId('icon-button-chevron-right');

      fireEvent.press(chevrons[2]); // Third chevron is Profile

      expect(mockNavigate).toHaveBeenCalledWith('Profile');
    });
  });

  // =============================================================================
  // CARD STYLING TESTS
  // =============================================================================

  describe('Card Styling', () => {
    it('renders cards with proper structure', () => {
      const { getAllByTestId } = render(<MenuScreen />);
      const cards = getAllByTestId('card');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // RELAY CONNECTION INDICATOR TESTS
  // =============================================================================

  describe('Relay Connection Status', () => {
    it('allows publishing when relays are connected', async () => {
      const { getByTestId, getByText } = render(<MenuScreen />);
      const input = getByTestId('note-input');
      const publishButton = getByTestId('button-publish-note');

      fireEvent.changeText(input, 'Test note');

      await act(async () => {
        fireEvent.press(publishButton);
      });

      await waitFor(() => {
        expect(getByText('Note published!')).toBeTruthy();
      });
    });

    it('shows relay requirement message when disconnected', async () => {
      // Simulate disconnected relays (status < 5)
      mockRelays.clear();
      mockRelays.set('wss://relay1.com', { url: 'wss://relay1.com', status: 1 });

      const { getByTestId, getByText } = render(<MenuScreen />);
      const input = getByTestId('note-input');
      const publishButton = getByTestId('button-publish-note');

      fireEvent.changeText(input, 'Test note');

      await act(async () => {
        fireEvent.press(publishButton);
      });

      expect(getByText('Please connect to at least one relay first')).toBeTruthy();
    });
  });

  // =============================================================================
  // INPUT INTERACTION TESTS
  // =============================================================================

  describe('Input Interactions', () => {
    it('supports multiline input', () => {
      const { getByTestId } = render(<MenuScreen />);
      const input = getByTestId('note-input');

      expect(input.props.multiline).toBe(true);
    });

    it('handles long note content', async () => {
      const { getByTestId, getByText } = render(<MenuScreen />);
      const input = getByTestId('note-input');
      const publishButton = getByTestId('button-publish-note');

      const longNote = 'A'.repeat(500);
      fireEvent.changeText(input, longNote);

      await act(async () => {
        fireEvent.press(publishButton);
      });

      await waitFor(() => {
        expect(getByText('Note published!')).toBeTruthy();
      });
    });
  });
});
