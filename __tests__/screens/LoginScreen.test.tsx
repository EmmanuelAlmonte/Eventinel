/**
 * LoginScreen Component Tests
 *
 * Tests the multi-signer login screen functionality including:
 * - NIP-55 (Android signer app) login
 * - NIP-46 (Remote bunker) login
 * - Manual private key login
 * - Error handling and validation
 * - Loading states
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

// Import the component
import LoginScreen from '../../screens/LoginScreen';

// Import mock helpers
import {
  mockNDKHooks,
  useNDK,
  useNip55,
  useNDKSessionLogin,
  NDKPrivateKeySigner,
  NDKNip55Signer,
  NDKNip46Signer,
} from '../../__mocks__/@nostr-dev-kit/mobile';

// =============================================================================
// TEST SETUP
// =============================================================================

describe('LoginScreen', () => {
  // Reset mocks before each test
  beforeEach(() => {
    mockNDKHooks.reset();
    jest.clearAllMocks();
  });

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe('Rendering', () => {
    it('renders the welcome title', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('Welcome to Eventinel')).toBeTruthy();
    });

    it('renders sign in subtitle', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('Sign in to continue')).toBeTruthy();
    });

    it('renders security warning section', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('Security Notice')).toBeTruthy();
      expect(getByText(/Never share your private key/)).toBeTruthy();
    });

    it('renders bunker login section', () => {
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);
      expect(getByText(/Remote Signer/)).toBeTruthy();
      expect(getByPlaceholderText('bunker://pubkey?relay=wss://...')).toBeTruthy();
      expect(getByText('Connect to Bunker')).toBeTruthy();
    });

    it('renders manual key login section', () => {
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);
      expect(getByText(/Manual Login/)).toBeTruthy();
      expect(getByPlaceholderText('nsec1... or hex private key')).toBeTruthy();
      expect(getByText('Login with Private Key')).toBeTruthy();
    });
  });

  // =============================================================================
  // PLATFORM-SPECIFIC TESTS
  // =============================================================================

  describe('Platform-specific rendering', () => {
    describe('Android platform', () => {
      beforeEach(() => {
        Platform.OS = 'android';
        mockNDKHooks.setNip55Available(true);
        mockNDKHooks.setNip55Apps([
          { packageName: 'com.greenart7c3.nostrsigner', name: 'Amber' },
        ]);
      });

      it('shows NIP-55 section when signer apps are available', () => {
        const { getByText } = render(<LoginScreen />);
        expect(getByText('Device Signer (Recommended)')).toBeTruthy();
        expect(getByText('Login with Amber')).toBeTruthy();
      });

      it('shows security notice mentioning NIP-55', () => {
        const { getByText } = render(<LoginScreen />);
        expect(getByText(/NIP-55 signer apps.*most secure/)).toBeTruthy();
      });
    });

    describe('iOS platform', () => {
      beforeEach(() => {
        Platform.OS = 'ios';
        mockNDKHooks.setNip55Available(false);
        mockNDKHooks.setNip55Apps([]);
      });

      it('does not show NIP-55 section on iOS', () => {
        const { queryByText } = render(<LoginScreen />);
        expect(queryByText('Device Signer (Recommended)')).toBeNull();
      });

      it('shows bunker as recommended on iOS', () => {
        const { getByText } = render(<LoginScreen />);
        expect(getByText('Remote Signer (Recommended)')).toBeTruthy();
      });
    });
  });

  // =============================================================================
  // NIP-55 LOGIN TESTS
  // =============================================================================

  describe('NIP-55 Login (Android)', () => {
    beforeEach(() => {
      Platform.OS = 'android';
      mockNDKHooks.setNip55Available(true);
      mockNDKHooks.setNip55Apps([
        { packageName: 'com.greenart7c3.nostrsigner', name: 'Amber' },
      ]);
    });

    it('calls login when NIP-55 button is pressed', async () => {
      const mockLogin = jest.fn().mockResolvedValue({});
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText } = render(<LoginScreen />);
      const loginButton = getByText('Login with Amber');

      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('shows loading state during NIP-55 login', async () => {
      const mockLogin = jest.fn().mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 1000))
      );
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText, queryByText } = render(<LoginScreen />);
      const loginButton = getByText('Login with Amber');

      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(queryByText('Connecting...')).toBeTruthy();
      });
    });

    it('displays error when NIP-55 login fails', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Signer unavailable'));
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText } = render(<LoginScreen />);
      const loginButton = getByText('Login with Amber');

      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Signer unavailable')).toBeTruthy();
      });
    });

    it('disables buttons during loading', async () => {
      const mockLogin = jest.fn().mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 1000))
      );
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText } = render(<LoginScreen />);
      const loginButton = getByText('Login with Amber');

      fireEvent.press(loginButton);

      await waitFor(() => {
        // During loading, the button should be disabled
        expect(loginButton.props.accessibilityState?.disabled).toBe(true);
      });
    });

    it('renders multiple signer apps when available', () => {
      mockNDKHooks.setNip55Apps([
        { packageName: 'com.greenart7c3.nostrsigner', name: 'Amber' },
        { packageName: 'com.example.signer', name: 'Another Signer' },
      ]);

      const { getByText } = render(<LoginScreen />);
      expect(getByText('Login with Amber')).toBeTruthy();
      expect(getByText('Login with Another Signer')).toBeTruthy();
    });
  });

  // =============================================================================
  // NIP-46 BUNKER LOGIN TESTS
  // =============================================================================

  describe('NIP-46 Bunker Login', () => {
    it('shows error for empty bunker URL', async () => {
      const { getByText } = render(<LoginScreen />);
      const connectButton = getByText('Connect to Bunker');

      fireEvent.press(connectButton);

      await waitFor(() => {
        expect(getByText('Please enter a bunker URL')).toBeTruthy();
      });
    });

    it('shows error when NDK is not initialized', async () => {
      (useNDK as jest.Mock).mockReturnValue({ ndk: null });

      const { getByText, getByPlaceholderText } = render(<LoginScreen />);
      const input = getByPlaceholderText('bunker://pubkey?relay=wss://...');
      const connectButton = getByText('Connect to Bunker');

      fireEvent.changeText(input, 'bunker://abc123?relay=wss://relay.example.com');
      fireEvent.press(connectButton);

      await waitFor(() => {
        expect(getByText('NDK not initialized')).toBeTruthy();
      });
    });

    it('calls login with bunker URL', async () => {
      const mockLogin = jest.fn().mockResolvedValue({});
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText, getByPlaceholderText } = render(<LoginScreen />);
      const input = getByPlaceholderText('bunker://pubkey?relay=wss://...');
      const connectButton = getByText('Connect to Bunker');

      fireEvent.changeText(input, 'bunker://abc123?relay=wss://relay.example.com');
      fireEvent.press(connectButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('displays error when bunker connection fails', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Connection timeout'));
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText, getByPlaceholderText } = render(<LoginScreen />);
      const input = getByPlaceholderText('bunker://pubkey?relay=wss://...');
      const connectButton = getByText('Connect to Bunker');

      fireEvent.changeText(input, 'bunker://abc123?relay=wss://relay.example.com');
      fireEvent.press(connectButton);

      await waitFor(() => {
        expect(getByText('Connection timeout')).toBeTruthy();
      });
    });

    it('trims whitespace from bunker URL', async () => {
      const mockLogin = jest.fn().mockResolvedValue({});
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText, getByPlaceholderText } = render(<LoginScreen />);
      const input = getByPlaceholderText('bunker://pubkey?relay=wss://...');
      const connectButton = getByText('Connect to Bunker');

      fireEvent.changeText(input, '  bunker://abc123?relay=wss://relay.example.com  ');
      fireEvent.press(connectButton);

      await waitFor(() => {
        // The signer should be created with trimmed URL
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });

  // =============================================================================
  // MANUAL KEY LOGIN TESTS
  // =============================================================================

  describe('Manual Private Key Login', () => {
    it('shows error for empty private key', async () => {
      const { getByText } = render(<LoginScreen />);
      const loginButton = getByText('Login with Private Key');

      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Please enter a private key')).toBeTruthy();
      });
    });

    it('calls login with valid private key', async () => {
      const mockLogin = jest.fn().mockResolvedValue({});
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText, getByPlaceholderText } = render(<LoginScreen />);
      const input = getByPlaceholderText('nsec1... or hex private key');
      const loginButton = getByText('Login with Private Key');

      // Use a valid-looking hex key (64 chars)
      const testKey = 'a'.repeat(64);
      fireEvent.changeText(input, testKey);
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('displays error for invalid private key', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid key format'));
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText, getByPlaceholderText } = render(<LoginScreen />);
      const input = getByPlaceholderText('nsec1... or hex private key');
      const loginButton = getByText('Login with Private Key');

      fireEvent.changeText(input, 'invalid-key');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText(/Invalid/)).toBeTruthy();
      });
    });

    it('trims whitespace from private key', async () => {
      const mockLogin = jest.fn().mockResolvedValue({});
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText, getByPlaceholderText } = render(<LoginScreen />);
      const input = getByPlaceholderText('nsec1... or hex private key');
      const loginButton = getByText('Login with Private Key');

      const testKey = '  ' + 'a'.repeat(64) + '  ';
      fireEvent.changeText(input, testKey);
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('uses secure text entry for private key input', () => {
      const { getByPlaceholderText } = render(<LoginScreen />);
      const input = getByPlaceholderText('nsec1... or hex private key');

      expect(input.props.secureTextEntry).toBe(true);
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    it('clears error when starting new login attempt', async () => {
      const mockLogin = jest
        .fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({});

      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText, getByPlaceholderText, queryByText } = render(<LoginScreen />);
      const input = getByPlaceholderText('nsec1... or hex private key');
      const loginButton = getByText('Login with Private Key');

      // First attempt - should show error
      fireEvent.changeText(input, 'a'.repeat(64));
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('First error')).toBeTruthy();
      });

      // Second attempt - error should be cleared
      fireEvent.changeText(input, 'b'.repeat(64));
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(queryByText('First error')).toBeNull();
      });
    });

    it('handles non-Error exception objects', async () => {
      const mockLogin = jest.fn().mockRejectedValue('String error');
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText, getByPlaceholderText } = render(<LoginScreen />);
      const input = getByPlaceholderText('nsec1... or hex private key');
      const loginButton = getByText('Login with Private Key');

      fireEvent.changeText(input, 'a'.repeat(64));
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Invalid private key')).toBeTruthy();
      });
    });
  });

  // =============================================================================
  // LOADING STATE TESTS
  // =============================================================================

  describe('Loading States', () => {
    it('shows loading overlay during login', async () => {
      const mockLogin = jest.fn().mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 500))
      );
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText, getByPlaceholderText, queryByText } = render(<LoginScreen />);
      const input = getByPlaceholderText('nsec1... or hex private key');
      const loginButton = getByText('Login with Private Key');

      fireEvent.changeText(input, 'a'.repeat(64));
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(queryByText('Connecting...')).toBeTruthy();
      });
    });

    it('hides loading overlay after login completes', async () => {
      const mockLogin = jest.fn().mockResolvedValue({});
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText, getByPlaceholderText, queryByText } = render(<LoginScreen />);
      const input = getByPlaceholderText('nsec1... or hex private key');
      const loginButton = getByText('Login with Private Key');

      fireEvent.changeText(input, 'a'.repeat(64));
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(queryByText('Connecting...')).toBeNull();
      });
    });

    it('hides loading overlay after login fails', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Failed'));
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText, getByPlaceholderText, queryByText } = render(<LoginScreen />);
      const input = getByPlaceholderText('nsec1... or hex private key');
      const loginButton = getByText('Login with Private Key');

      fireEvent.changeText(input, 'a'.repeat(64));
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Failed')).toBeTruthy();
        expect(queryByText('Connecting...')).toBeNull();
      });
    });

    it('disables all inputs during loading', async () => {
      const mockLogin = jest.fn().mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 500))
      );
      (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

      const { getByText, getByPlaceholderText } = render(<LoginScreen />);
      const bunkerInput = getByPlaceholderText('bunker://pubkey?relay=wss://...');
      const keyInput = getByPlaceholderText('nsec1... or hex private key');
      const loginButton = getByText('Login with Private Key');

      fireEvent.changeText(keyInput, 'a'.repeat(64));
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(bunkerInput.props.editable).toBe(false);
        expect(keyInput.props.editable).toBe(false);
      });
    });
  });
});
