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
import { render, fireEvent } from '@testing-library/react-native';
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

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-notifications', () => ({
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
}));

jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: mockColors,
    isDark: true,
    toggleMode: jest.fn(),
  }),
}));

const mockUsePushSettings = jest.fn(() => ({
  pushToken: null,
  isLoadingPushToken: false,
  pushPermissionStatus: null,
  isRequestingPermission: false,
  isRegisteringPush: false,
  requestPermission: jest.fn(),
  registerPushToken: jest.fn(),
}));

jest.mock('../../screens/profile/usePushSettings', () => ({
  usePushSettings: () => mockUsePushSettings(),
}));

// Import the component
import ProfileScreen from '../../screens/ProfileScreen';

// Import mock helpers
import {
  mockNDKHooks,
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
    mockUsePushSettings.mockReturnValue({
      pushToken: null,
      isLoadingPushToken: false,
      pushPermissionStatus: null,
      isRequestingPermission: false,
      isRegisteringPush: false,
      requestPermission: jest.fn(),
      registerPushToken: jest.fn(),
    });
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
      expect(getByText('Manage your identity, connections, and app settings')).toBeTruthy();
    });

    it('renders the logout button', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Logout')).toBeTruthy();
    });

    it('renders session control copy', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Clear the local session from this device')).toBeTruthy();
    });

    it('shows wallet settings row when at least one wallet feature is enabled', () => {
      mockFeatureFlags.isCashuWalletFeatureEnabled = true;
      mockFeatureFlags.isLightningWalletFeatureEnabled = false;

      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Wallet')).toBeTruthy();
    });

    it('renders app settings rows', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('App')).toBeTruthy();
      expect(getByText('Appearance')).toBeTruthy();
      expect(getByText('Notifications')).toBeTruthy();
    });

    it('hides wallet settings row when wallet features are disabled', () => {
      mockFeatureFlags.isCashuWalletFeatureEnabled = false;
      mockFeatureFlags.isLightningWalletFeatureEnabled = false;

      const { getByText, queryByText } = render(<ProfileScreen />);
      expect(queryByText('Wallet')).toBeNull();
      expect(getByText('Relay settings')).toBeTruthy();
    });

    it('shows granted notification status when permission is granted', () => {
      mockUsePushSettings.mockReturnValue({
        pushToken: null,
        isLoadingPushToken: false,
        pushPermissionStatus: 'granted' as any,
        isRequestingPermission: false,
        isRegisteringPush: false,
        requestPermission: jest.fn(),
        registerPushToken: jest.fn(),
      });

      const { getByText, getAllByText } = render(<ProfileScreen />);
      expect(getAllByText('Granted')).toHaveLength(2);
      expect(getByText('Alerts are enabled on this device')).toBeTruthy();
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
      expect(getByText('abc123def456...abc123def456')).toBeTruthy();
    });

    it('displays pubkey label', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Public key')).toBeTruthy();
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
      expect(queryByText('Public key')).toBeNull();
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
      expect(getByText('aaaaaaaaaaaa...aaaaaaaaaaaa')).toBeTruthy();
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
    it('renders public key copy affordance', () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Copy')).toBeTruthy();
      expect(getByText('Copy key')).toBeTruthy();
    });

    it('renders advanced notification actions in development', () => {
      const requestPermission = jest.fn();
      const registerPushToken = jest.fn();
      mockUsePushSettings.mockReturnValue({
        pushToken: null,
        isLoadingPushToken: false,
        pushPermissionStatus: null,
        isRequestingPermission: false,
        isRegisteringPush: false,
        requestPermission,
        registerPushToken,
      });

      const { getByText } = render(<ProfileScreen />);
      fireEvent.press(getByText('Request permission'));
      fireEvent.press(getByText('Register token'));

      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(registerPushToken).toHaveBeenCalledTimes(1);
    });
  });
});
