/**
 * RelayConnectScreen Component Tests
 *
 * Tests the relay management screen functionality including:
 * - Relay list display
 * - Adding new relays
 * - Removing relays
 * - Status indicators
 * - URL validation
 * - Empty state
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// =============================================================================
// MOCK SETUP - Must be before imports that use the mocked modules
// =============================================================================

// Create the relays Map that will be used - needs to be a global for jest.mock hoisting
const mockRelaysMap = new Map<string, any>();

// Mock functions stored in variables accessible from both mock and tests
const mockFunctions = {
  addExplicitRelay: jest.fn(),
  removeRelay: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  addRelayToStorage: jest.fn().mockResolvedValue(undefined),
  removeRelayFromStorage: jest.fn().mockResolvedValue(undefined),
};

// Mock ndk singleton
jest.mock('../../lib/ndk', () => {
  const relaysMap = new Map();
  return {
    ndk: {
      pool: {
        get relays() {
          return relaysMap;
        },
        on: jest.fn(),
        off: jest.fn(),
        removeRelay: jest.fn(),
      },
      addExplicitRelay: jest.fn().mockImplementation((url: string) => ({
        url,
        status: 4,
        connect: jest.fn(),
      })),
    },
    __mockRelaysMap: relaysMap,
  };
});

// Mock relay status utilities
jest.mock('../../lib/relay/status', () => ({
  isConnected: (status: number) => status >= 5,
  isConnecting: (status: number) => status === 4,
  getStatusString: (status: number) => {
    if (status >= 5) return 'connected';
    if (status === 4) return 'connecting';
    return 'disconnected';
  },
}));

// Mock relay storage
jest.mock('../../lib/relay/storage', () => {
  const addRelayToStorage = jest.fn().mockResolvedValue(undefined);
  const removeRelayFromStorage = jest.fn().mockResolvedValue(undefined);

  return {
    addRelayToStorage,
    removeRelayFromStorage,
    saveRelays: jest.fn().mockResolvedValue(undefined),
    DEFAULT_RELAYS: ['wss://relay.eventinel.com'],
    LOCAL_RELAYS: ['ws://10.0.0.197:8085'],
  };
});

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

// Mock NDKRelayStatus
jest.mock('@nostr-dev-kit/mobile', () => ({
  NDKRelayStatus: {
    DISCONNECTED: 1,
    CONNECTING: 4,
    CONNECTED: 5,
    AUTHENTICATED: 8,
  },
}));

// Mock @rneui/themed
jest.mock('@rneui/themed', () => ({
  Text: ({ children, style, h2, numberOfLines, ellipsizeMode, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text style={style} numberOfLines={numberOfLines} {...props}>{children}</Text>;
  },
  Card: ({ children, containerStyle }: any) => {
    const { View } = require('react-native');
    return <View style={containerStyle} testID="card">{children}</View>;
  },
  Icon: ({ name, color, size, type, onPress }: any) => {
    const { Pressable, Text, View } = require('react-native');
    if (onPress) {
      return (
        <Pressable testID={`icon-button-${name}`} onPress={onPress}>
          <Text>{name}</Text>
        </Pressable>
      );
    }
    return (
      <View testID={`icon-${name}`}>
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
  Input: ({ placeholder, value, onChangeText, autoCapitalize, autoCorrect, leftIcon, containerStyle, inputContainerStyle, inputStyle, placeholderTextColor }: any) => {
    const { TextInput, View } = require('react-native');
    return (
      <View style={containerStyle}>
        {leftIcon}
        <TextInput
          testID="relay-url-input"
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          style={[inputContainerStyle, inputStyle]}
          placeholderTextColor={placeholderTextColor}
        />
      </View>
    );
  },
  Switch: ({ value, onValueChange, disabled }: any) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        onPress={() => {
          if (!disabled && onValueChange) onValueChange(!value);
        }}
      >
        <Text>{value ? 'On' : 'Off'}</Text>
      </Pressable>
    );
  },
}));

// Import component after all mocks are set up
import RelayConnectScreen from '../../screens/RelayConnectScreen';
import { ndk } from '../../lib/ndk';

// Get references to the mocked functions
const mockAddExplicitRelay = ndk.addExplicitRelay as jest.Mock;
const mockRemoveRelay = ndk.pool.removeRelay as jest.Mock;
const mockOn = ndk.pool.on as jest.Mock;
const mockOff = ndk.pool.off as jest.Mock;
const { __mockRelaysMap } = jest.requireMock('../../lib/ndk') as {
  __mockRelaysMap: Map<string, any>;
};
const {
  addRelayToStorage: mockAddRelayToStorage,
  removeRelayFromStorage: mockRemoveRelayFromStorage,
} = jest.requireMock('../../lib/relay/storage') as {
  addRelayToStorage: jest.Mock;
  removeRelayFromStorage: jest.Mock;
};

// =============================================================================
// TEST SUITE
// =============================================================================

describe('RelayConnectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __mockRelaysMap.clear();
    // Add some default relays
    __mockRelaysMap.set('wss://relay1.com', { url: 'wss://relay1.com', status: 5 });
    __mockRelaysMap.set('wss://relay2.com', { url: 'wss://relay2.com', status: 4 });
  });

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe('Rendering', () => {
    it('renders the screen title', () => {
      const { getByText } = render(<RelayConnectScreen />);
      expect(getByText('Relay Management')).toBeTruthy();
    });

    it('renders relay count in subtitle', () => {
      const { getByText } = render(<RelayConnectScreen />);
      expect(getByText(/2 relays/)).toBeTruthy();
    });

    it('renders connected count in subtitle', () => {
      const { getByText } = render(<RelayConnectScreen />);
      expect(getByText(/1 connected/)).toBeTruthy();
    });

    it('renders Add New Relay section', () => {
      const { getByText } = render(<RelayConnectScreen />);
      expect(getByText('Add New Relay')).toBeTruthy();
    });

    it('renders Connected Relays section', () => {
      const { getByText } = render(<RelayConnectScreen />);
      expect(getByText('Connected Relays')).toBeTruthy();
    });

    it('renders info note about relay persistence', () => {
      const { getByText } = render(<RelayConnectScreen />);
      expect(getByText(/Relays are saved locally/)).toBeTruthy();
    });

    it('renders screen container with scroll', () => {
      const { getByTestId } = render(<RelayConnectScreen />);
      expect(getByTestId('screen-container-scroll')).toBeTruthy();
    });
  });

  // =============================================================================
  // RELAY INPUT TESTS
  // =============================================================================

  describe('Relay URL Input', () => {
    it('renders relay URL input placeholder', () => {
      const { getByPlaceholderText } = render(<RelayConnectScreen />);
      expect(getByPlaceholderText('wss://relay.example.com')).toBeTruthy();
    });

    it('renders connect button', () => {
      const { getByTestId } = render(<RelayConnectScreen />);
      expect(getByTestId('button-connect')).toBeTruthy();
    });

    it('allows typing relay URL', () => {
      const { getByTestId } = render(<RelayConnectScreen />);
      const input = getByTestId('relay-url-input');

      fireEvent.changeText(input, 'wss://new-relay.com');

      expect(input.props.value).toBe('wss://new-relay.com');
    });

    it('renders link icon in input', () => {
      const { getByTestId } = render(<RelayConnectScreen />);
      expect(getByTestId('icon-link')).toBeTruthy();
    });

    it('renders wifi icon in connect button', () => {
      const { getByTestId } = render(<RelayConnectScreen />);
      expect(getByTestId('icon-wifi')).toBeTruthy();
    });

    it('renders add-circle icon in section header', () => {
      const { getByTestId } = render(<RelayConnectScreen />);
      expect(getByTestId('icon-add-circle-outline')).toBeTruthy();
    });
  });

  // =============================================================================
  // URL VALIDATION TESTS
  // =============================================================================

  describe('URL Validation', () => {
    it('shows error when URL is empty', async () => {
      const { getByTestId, getByText } = render(<RelayConnectScreen />);
      const connectButton = getByTestId('button-connect');

      await act(async () => {
        fireEvent.press(connectButton);
      });

      expect(getByText('Please enter a relay URL')).toBeTruthy();
    });

    it('shows error for invalid URL without wss:// prefix', async () => {
      const { getByTestId, getByText } = render(<RelayConnectScreen />);
      const input = getByTestId('relay-url-input');
      const connectButton = getByTestId('button-connect');

      fireEvent.changeText(input, 'relay.example.com');

      await act(async () => {
        fireEvent.press(connectButton);
      });

      expect(getByText('Relay URL must start with wss:// or ws://')).toBeTruthy();
    });

    it('accepts wss:// URLs', async () => {
      const { getByTestId, queryByText } = render(<RelayConnectScreen />);
      const input = getByTestId('relay-url-input');
      const connectButton = getByTestId('button-connect');

      fireEvent.changeText(input, 'wss://valid-relay.com');

      await act(async () => {
        fireEvent.press(connectButton);
      });

      expect(queryByText('Relay URL must start with wss:// or ws://')).toBeNull();
      expect(mockAddExplicitRelay).toHaveBeenCalledWith('wss://valid-relay.com');
    });

    it('accepts ws:// URLs', async () => {
      const { getByTestId, queryByText } = render(<RelayConnectScreen />);
      const input = getByTestId('relay-url-input');
      const connectButton = getByTestId('button-connect');

      fireEvent.changeText(input, 'ws://local-relay.com');

      await act(async () => {
        fireEvent.press(connectButton);
      });

      expect(queryByText('Relay URL must start with wss:// or ws://')).toBeNull();
      expect(mockAddExplicitRelay).toHaveBeenCalledWith('ws://local-relay.com');
    });

    it('trims whitespace from URL', async () => {
      const { getByTestId } = render(<RelayConnectScreen />);
      const input = getByTestId('relay-url-input');
      const connectButton = getByTestId('button-connect');

      fireEvent.changeText(input, '  wss://relay.com  ');

      await act(async () => {
        fireEvent.press(connectButton);
      });

      expect(mockAddExplicitRelay).toHaveBeenCalledWith('wss://relay.com');
    });
  });

  // =============================================================================
  // ADD RELAY TESTS
  // =============================================================================

  describe('Adding Relays', () => {
    it('adds relay to NDK pool', async () => {
      const { getByTestId } = render(<RelayConnectScreen />);
      const input = getByTestId('relay-url-input');
      const connectButton = getByTestId('button-connect');

      fireEvent.changeText(input, 'wss://new-relay.com');

      await act(async () => {
        fireEvent.press(connectButton);
      });

      expect(mockAddExplicitRelay).toHaveBeenCalledWith('wss://new-relay.com');
    });

    it('saves relay to storage', async () => {
      const { getByTestId } = render(<RelayConnectScreen />);
      const input = getByTestId('relay-url-input');
      const connectButton = getByTestId('button-connect');

      fireEvent.changeText(input, 'wss://new-relay.com');

      await act(async () => {
        fireEvent.press(connectButton);
      });

      expect(mockAddRelayToStorage).toHaveBeenCalledWith('wss://new-relay.com');
    });

    it('clears input after adding relay', async () => {
      const { getByTestId } = render(<RelayConnectScreen />);
      const input = getByTestId('relay-url-input');
      const connectButton = getByTestId('button-connect');

      fireEvent.changeText(input, 'wss://new-relay.com');

      await act(async () => {
        fireEvent.press(connectButton);
      });

      expect(input.props.value).toBe('');
    });

    it('shows connecting message after adding', async () => {
      const { getByTestId, getByText } = render(<RelayConnectScreen />);
      const input = getByTestId('relay-url-input');
      const connectButton = getByTestId('button-connect');

      fireEvent.changeText(input, 'wss://new-relay.com');

      await act(async () => {
        fireEvent.press(connectButton);
      });

      expect(getByText(/Connecting to wss:\/\/new-relay.com/)).toBeTruthy();
    });
  });

  // =============================================================================
  // RELAY LIST TESTS
  // =============================================================================

  describe('Relay List', () => {
    it('displays relay URLs', () => {
      const { getByText } = render(<RelayConnectScreen />);
      expect(getByText('wss://relay1.com')).toBeTruthy();
      expect(getByText('wss://relay2.com')).toBeTruthy();
    });

    it('displays relay status text', () => {
      const { getByText } = render(<RelayConnectScreen />);
      expect(getByText('connected')).toBeTruthy();
      expect(getByText('connecting')).toBeTruthy();
    });

    it('renders remove buttons for each relay', () => {
      const { getAllByTestId } = render(<RelayConnectScreen />);
      const closeButtons = getAllByTestId('icon-close');
      expect(closeButtons.length).toBe(2);
    });
  });

  // =============================================================================
  // REMOVE RELAY TESTS
  // =============================================================================

  describe('Removing Relays', () => {
    it('shows confirmation alert when remove is pressed', async () => {
      const { getAllByLabelText } = render(<RelayConnectScreen />);
      const disconnectButtons = getAllByLabelText(/Disconnect/);

      await act(async () => {
        fireEvent.press(disconnectButtons[0]);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Disconnect Relay',
        expect.any(String),
        expect.any(Array)
      );
    });

    it('confirmation alert includes relay URL', async () => {
      const { getAllByLabelText } = render(<RelayConnectScreen />);
      const disconnectButtons = getAllByLabelText(/Disconnect wss:\/\/relay1.com/);

      await act(async () => {
        fireEvent.press(disconnectButtons[0]);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Disconnect Relay',
        expect.stringContaining('wss://relay1.com'),
        expect.any(Array)
      );
    });

    it('provides cancel option in confirmation', async () => {
      const { getAllByLabelText } = render(<RelayConnectScreen />);
      const disconnectButtons = getAllByLabelText(/Disconnect/);

      await act(async () => {
        fireEvent.press(disconnectButtons[0]);
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const cancelButton = buttons.find((b: any) => b.text === 'Cancel');

      expect(cancelButton).toBeDefined();
      expect(cancelButton.style).toBe('cancel');
    });

    it('provides destructive remove option', async () => {
      const { getAllByLabelText } = render(<RelayConnectScreen />);
      const disconnectButtons = getAllByLabelText(/Disconnect/);

      await act(async () => {
        fireEvent.press(disconnectButtons[0]);
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const removeButton = buttons.find((b: any) => b.text === 'Remove');

      expect(removeButton).toBeDefined();
      expect(removeButton.style).toBe('destructive');
    });

    it('removes relay from pool when confirmed', async () => {
      const { getAllByLabelText } = render(<RelayConnectScreen />);
      const disconnectButtons = getAllByLabelText(/Disconnect wss:\/\/relay1.com/);

      await act(async () => {
        fireEvent.press(disconnectButtons[0]);
      });

      // Simulate pressing the "Remove" button in the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const removeButton = buttons.find((b: any) => b.text === 'Remove');

      await act(async () => {
        removeButton.onPress();
      });

      expect(mockRemoveRelay).toHaveBeenCalledWith('wss://relay1.com');
    });

    it('removes relay from storage when confirmed', async () => {
      const { getAllByLabelText } = render(<RelayConnectScreen />);
      const disconnectButtons = getAllByLabelText(/Disconnect wss:\/\/relay1.com/);

      await act(async () => {
        fireEvent.press(disconnectButtons[0]);
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const removeButton = buttons.find((b: any) => b.text === 'Remove');

      await act(async () => {
        removeButton.onPress();
      });

      expect(mockRemoveRelayFromStorage).toHaveBeenCalledWith('wss://relay1.com');
    });

    it('shows removed message after removal', async () => {
      const { getAllByLabelText, getByText } = render(<RelayConnectScreen />);
      const disconnectButtons = getAllByLabelText(/Disconnect wss:\/\/relay1.com/);

      await act(async () => {
        fireEvent.press(disconnectButtons[0]);
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const removeButton = buttons.find((b: any) => b.text === 'Remove');

      await act(async () => {
        removeButton.onPress();
      });

      await waitFor(() => {
        expect(getByText(/Removed wss:\/\/relay1.com/)).toBeTruthy();
      });
    });
  });

  // =============================================================================
  // EMPTY STATE TESTS
  // =============================================================================

  describe('Empty State', () => {
    it('shows empty state when no relays', () => {
      __mockRelaysMap.clear();

      const { getByText } = render(<RelayConnectScreen />);
      expect(getByText('No relays added')).toBeTruthy();
    });

    it('shows hint text in empty state', () => {
      __mockRelaysMap.clear();

      const { getByText } = render(<RelayConnectScreen />);
      expect(getByText('Add a relay URL above to get started')).toBeTruthy();
    });

    it('shows cloud-off icon in empty state', () => {
      __mockRelaysMap.clear();

      const { getByTestId } = render(<RelayConnectScreen />);
      expect(getByTestId('icon-cloud-off')).toBeTruthy();
    });

    it('shows 0 relays in subtitle', () => {
      __mockRelaysMap.clear();

      const { getByText } = render(<RelayConnectScreen />);
      expect(getByText(/0 relays/)).toBeTruthy();
    });
  });

  // =============================================================================
  // STATUS MESSAGE TESTS
  // =============================================================================

  describe('Status Messages', () => {
    it('shows success styling for successful operations', async () => {
      const { getByTestId, getByText } = render(<RelayConnectScreen />);
      const input = getByTestId('relay-url-input');
      const connectButton = getByTestId('button-connect');

      fireEvent.changeText(input, 'wss://new-relay.com');

      await act(async () => {
        fireEvent.press(connectButton);
      });

      // Success icon should appear with the status message
      await waitFor(() => {
        expect(getByTestId('icon-check-circle-outline')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('shows error styling for validation errors', async () => {
      const { getByTestId } = render(<RelayConnectScreen />);
      const connectButton = getByTestId('button-connect');

      await act(async () => {
        fireEvent.press(connectButton);
      });

      expect(getByTestId('icon-error-outline')).toBeTruthy();
    });
  });

  // =============================================================================
  // EVENT LISTENER TESTS
  // =============================================================================

  describe('Event Listeners', () => {
    it('sets up relay connect listener on mount', () => {
      render(<RelayConnectScreen />);

      expect(mockOn).toHaveBeenCalledWith('relay:connect', expect.any(Function));
    });

    it('sets up relay disconnect listener on mount', () => {
      render(<RelayConnectScreen />);

      expect(mockOn).toHaveBeenCalledWith('relay:disconnect', expect.any(Function));
    });

    it('sets up relay connecting listener on mount', () => {
      render(<RelayConnectScreen />);

      expect(mockOn).toHaveBeenCalledWith('relay:connecting', expect.any(Function));
    });

    it('removes listeners on unmount', () => {
      const { unmount } = render(<RelayConnectScreen />);

      unmount();

      expect(mockOff).toHaveBeenCalledWith('relay:connect', expect.any(Function));
      expect(mockOff).toHaveBeenCalledWith('relay:disconnect', expect.any(Function));
      expect(mockOff).toHaveBeenCalledWith('relay:connecting', expect.any(Function));
    });
  });

  // =============================================================================
  // SECTION ICON TESTS
  // =============================================================================

  describe('Section Icons', () => {
    it('renders dns icon in relay list section', () => {
      const { getByTestId } = render(<RelayConnectScreen />);
      expect(getByTestId('icon-dns')).toBeTruthy();
    });

    it('renders info icon in footer note', () => {
      const { getByTestId } = render(<RelayConnectScreen />);
      expect(getByTestId('icon-info-outline')).toBeTruthy();
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe('Accessibility', () => {
    it('disconnect buttons have accessibility labels', () => {
      const { getAllByLabelText } = render(<RelayConnectScreen />);
      const buttons = getAllByLabelText(/Disconnect/);
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('disconnect buttons have correct accessibility role', () => {
      const { getAllByRole } = render(<RelayConnectScreen />);
      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
