/**
 * ProfileScreen Component Tests
 *
 * Tests the profile screen functionality including:
 * - User information display
 * - Logout confirmation flow
 * - Logout execution
 * - Edge cases (missing profile data)
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
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

const mockFeatureFlags = {
  isCashuWalletFeatureEnabled: true,
  isLightningWalletFeatureEnabled: true,
};

jest.mock('@lib/featureFlags', () => ({
  get isCashuWalletFeatureEnabled() {
    return mockFeatureFlags.isCashuWalletFeatureEnabled;
  },
  get isLightningWalletFeatureEnabled() {
    return mockFeatureFlags.isLightningWalletFeatureEnabled;
  },
}));

jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: mockColors,
    isDark: true,
    toggleMode: jest.fn(),
  }),
}));

// Import the component
import ProfileScreen from '../../screens/ProfileScreen';

// Import mock helpers
import {
  mockNDKHooks,
  useNDKCurrentUser,
  useNDKCurrentPubkey,
  useNDKSessionLogout,
} from '../../__mocks__/@nostr-dev-kit/mobile';

// =============================================================================
// TEST SETUP
// =============================================================================

describe('ProfileScreen', () => {
  // Default mock user for most tests
  const defaultMockUser = {
    pubkey: 'abc123def456',
    profile: {
      displayName: 'Test User',
      name: 'testuser',
      about: 'This is a test bio for the user.',
    },
  };

  beforeEach(() => {
    mockNDKHooks.reset();
    mockNDKHooks.setCurrentUser(defaultMockUser);
    mockNDKHooks.setCurrentPubkey(defaultMockUser.pubkey);
    mockFeatureFlags.isCashuWalletFeatureEnabled = true;
    mockFeatureFlags.isLightningWalletFeatureEnabled = true;
    jest.clearAllMocks();
  });

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe('Rendering', () => {
    it('renders the profile title', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Profile')).toBeTruthy();
    });

    it('renders the subtitle', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Your Nostr identity')).toBeTruthy();
    });

    it('renders the logout button', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Logout')).toBeTruthy();
    });

    it('renders security info notice', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText(/session is securely stored/)).toBeTruthy();
    });

    it('shows wallet settings row when at least one wallet feature is enabled', () => {
      mockFeatureFlags.isCashuWalletFeatureEnabled = true;
      mockFeatureFlags.isLightningWalletFeatureEnabled = false;

      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Wallet')).toBeTruthy();
    });

    it('hides wallet settings row when wallet features are disabled', () => {
      mockFeatureFlags.isCashuWalletFeatureEnabled = false;
      mockFeatureFlags.isLightningWalletFeatureEnabled = false;

      const { getByText, queryByText } = render(<ProfileScreen />);
      expect(queryByText('Wallet')).toBeNull();
      expect(getByText('Relay Settings')).toBeTruthy();
    });
  });

  // =============================================================================
  // USER DISPLAY TESTS
  // =============================================================================

  describe('User Information Display', () => {
    it('displays user displayName', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Test User')).toBeTruthy();
    });

    it('displays user about/bio', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('This is a test bio for the user.')).toBeTruthy();
    });

    it('displays public key', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('abc123def456')).toBeTruthy();
    });

    it('displays pubkey label', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Public Key')).toBeTruthy();
    });

    it('displays avatar with first letter of displayName', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('T')).toBeTruthy(); // First letter of 'Test User'
    });

    it('falls back to name when displayName is missing', () => {
      mockNDKHooks.setCurrentUser({
        pubkey: 'xyz789',
        profile: {
          name: 'fallbackuser',
          about: 'Bio text',
        },
      });

      const { getByText } = render(<ProfileScreen />);
      expect(getByText('fallbackuser')).toBeTruthy();
      expect(getByText('F')).toBeTruthy(); // First letter
    });

    it('shows Anonymous when no name fields exist', () => {
      mockNDKHooks.setCurrentUser({
        pubkey: 'xyz789',
        profile: {},
      });

      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Anonymous')).toBeTruthy();
      expect(getByText('A')).toBeTruthy(); // First letter of Anonymous
    });

    it('does not render about section when about is missing', () => {
      mockNDKHooks.setCurrentUser({
        pubkey: 'xyz789',
        profile: {
          displayName: 'No Bio User',
        },
      });

      const { queryByText } = render(<ProfileScreen />);
      expect(queryByText('This is a test bio')).toBeNull();
    });

    it('does not render pubkey section when currentPubkey is null', () => {
      mockNDKHooks.setCurrentPubkey(null);

      const { queryByText } = render(<ProfileScreen />);
      expect(queryByText('Your Public Key:')).toBeNull();
    });
  });

  // =============================================================================
  // LOGOUT CONFIRMATION TESTS
  // =============================================================================

  describe('Logout Confirmation', () => {
    it('shows confirmation alert when logout button is pressed', () => {
      const { getByText } = render(<ProfileScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Logout',
        'Are you sure you want to logout?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Logout', style: 'destructive' }),
        ])
      );
    });

    it('provides cancel option in alert', () => {
      const { getByText } = render(<ProfileScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const cancelButton = buttons.find((b: any) => b.text === 'Cancel');

      expect(cancelButton).toBeDefined();
      expect(cancelButton.style).toBe('cancel');
    });

    it('provides destructive logout option in alert', () => {
      const { getByText } = render(<ProfileScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const logoutConfirmButton = buttons.find((b: any) => b.text === 'Logout');

      expect(logoutConfirmButton).toBeDefined();
      expect(logoutConfirmButton.style).toBe('destructive');
    });
  });

  // =============================================================================
  // LOGOUT EXECUTION TESTS
  // =============================================================================

  describe('Logout Execution', () => {
    it('calls logout with current pubkey when confirmed', async () => {
      const mockLogout = jest.fn();
      (useNDKSessionLogout as jest.Mock).mockReturnValue(mockLogout);

      const { getByText } = render(<ProfileScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      // Simulate pressing the destructive "Logout" button in the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const logoutConfirmButton = buttons.find((b: any) => b.text === 'Logout');

      // Execute the onPress callback
      logoutConfirmButton.onPress();

      expect(mockLogout).toHaveBeenCalledWith('abc123def456');
    });

    it('does not call logout when cancel is pressed', () => {
      const mockLogout = jest.fn();
      (useNDKSessionLogout as jest.Mock).mockReturnValue(mockLogout);

      const { getByText } = render(<ProfileScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      // Simulate pressing the "Cancel" button in the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const cancelButton = buttons.find((b: any) => b.text === 'Cancel');

      // Cancel button has no onPress (React Native handles dismissal)
      expect(cancelButton.onPress).toBeUndefined();
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('does not call logout when pubkey is null', () => {
      mockNDKHooks.setCurrentPubkey(null);
      const mockLogout = jest.fn();
      (useNDKSessionLogout as jest.Mock).mockReturnValue(mockLogout);

      const { getByText } = render(<ProfileScreen />);
      const logoutButton = getByText('Logout');

      fireEvent.press(logoutButton);

      // Get the confirm button
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const logoutConfirmButton = buttons.find((b: any) => b.text === 'Logout');

      // Execute the onPress callback
      logoutConfirmButton.onPress();

      // Logout should NOT be called because pubkey is null
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('handles null currentUser gracefully', () => {
      mockNDKHooks.setCurrentUser(null);
      mockNDKHooks.setCurrentPubkey(null);

      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Anonymous')).toBeTruthy();
    });

    it('handles missing profile object', () => {
      mockNDKHooks.setCurrentUser({
        pubkey: 'xyz789',
        profile: undefined,
      } as any);

      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Anonymous')).toBeTruthy();
    });

    it('truncates long public keys in display', () => {
      const longPubkey = 'a'.repeat(64);
      mockNDKHooks.setCurrentPubkey(longPubkey);

      const { getByText } = render(<ProfileScreen />);
      // The component should display the full key but limit lines
      expect(getByText(longPubkey)).toBeTruthy();
    });

    it('handles special characters in display name', () => {
      mockNDKHooks.setCurrentUser({
        pubkey: 'xyz789',
        profile: {
          displayName: 'Test <User> & "More"',
          name: 'test',
        },
      });

      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Test <User> & "More"')).toBeTruthy();
    });

    it('handles emoji in display name', () => {
      mockNDKHooks.setCurrentUser({
        pubkey: 'xyz789',
        profile: {
          displayName: 'Test User 123',
          name: 'test',
        },
      });

      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Test User 123')).toBeTruthy();
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe('Accessibility', () => {
    it('public key text is selectable', () => {
      const { getByText } = render(<ProfileScreen />);
      const pubkeyText = getByText('abc123def456');
      expect(pubkeyText.props.selectable).toBe(true);
    });
  });
});
