/**
 * App Component Tests
 *
 * Tests the main App component's authentication guard functionality:
 * - Shows LoginScreen when user is not authenticated
 * - Shows main navigation when user is authenticated
 * - Handles loading states during initialization
 * - NDK and session monitor integration
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// Mock useAppTheme for LoginWrapper
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
  ...jest.requireActual('@hooks'),
  useAppTheme: () => ({
    colors: mockColors,
    isDark: true,
  }),
}));

// We need to mock the modules before importing App
jest.mock('../lib/ndk', () => ({
  ndk: {
    connect: jest.fn().mockResolvedValue(undefined),
    addExplicitRelay: jest.fn(),
    pool: { on: jest.fn() },
  },
}));

jest.mock('../lib/relay/storage', () => ({
  loadRelays: jest.fn().mockResolvedValue(['wss://relay.test.com']),
}));

// Import after mocks are set up
import App from '../App';
import {
  mockNDKHooks,
  useNDKCurrentUser,
  useSessionMonitor,
  useNDKInit,
} from '../__mocks__/@nostr-dev-kit/mobile';
import { ndk } from '../lib/ndk';
import { loadRelays } from '../lib/relay/storage';

// =============================================================================
// TEST SETUP
// =============================================================================

describe('App', () => {
  beforeEach(() => {
    mockNDKHooks.reset();
    jest.clearAllMocks();

    // Reset loadRelays mock to return default value
    (loadRelays as jest.Mock).mockResolvedValue(['wss://relay.test.com']);
  });

  // =============================================================================
  // AUTH GUARD TESTS
  // =============================================================================

  describe('Authentication Guard', () => {
    it('shows LoginScreen when user is not authenticated', async () => {
      mockNDKHooks.setCurrentUser(null);

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Welcome to Eventinel')).toBeTruthy();
      });
    });

    it('shows main navigation when user is authenticated', async () => {
      mockNDKHooks.setCurrentUser({
        pubkey: 'authenticated_user_pubkey',
        profile: { displayName: 'Auth User' },
      });

      const { queryByText } = render(<App />);

      await waitFor(() => {
        // LoginScreen should NOT be visible
        expect(queryByText('Welcome to Eventinel')).toBeNull();
      });
    });

    it('transitions from LoginScreen to main app after authentication', async () => {
      // Start unauthenticated
      mockNDKHooks.setCurrentUser(null);

      const { getByText, queryByText, rerender } = render(<App />);

      await waitFor(() => {
        expect(getByText('Welcome to Eventinel')).toBeTruthy();
      });

      // Simulate user authentication
      mockNDKHooks.setCurrentUser({
        pubkey: 'new_user_pubkey',
        profile: { displayName: 'New User' },
      });

      // Re-render to simulate hook update
      rerender(<App />);

      await waitFor(() => {
        // LoginScreen should now be hidden
        // Note: In real app, useNDKCurrentUser would trigger re-render
        expect(queryByText('Welcome to Eventinel')).toBeNull();
      });
    });
  });

  // =============================================================================
  // INITIALIZATION TESTS
  // =============================================================================

  describe('Initialization', () => {
    it('initializes NDK on mount', async () => {
      const initMock = jest.fn();
      (useNDKInit as jest.Mock).mockReturnValue(initMock);

      render(<App />);

      await waitFor(() => {
        expect(initMock).toHaveBeenCalledWith(ndk);
      });
    });

    it('calls useSessionMonitor with profile option', async () => {
      render(<App />);

      await waitFor(() => {
        expect(useSessionMonitor).toHaveBeenCalledWith({
          profile: true,
        });
      });
    });

    it('loads saved relays on initialization', async () => {
      render(<App />);

      await waitFor(() => {
        expect(loadRelays).toHaveBeenCalled();
      });
    });

    it('adds loaded relays to NDK pool', async () => {
      (loadRelays as jest.Mock).mockResolvedValue([
        'wss://relay1.test.com',
        'wss://relay2.test.com',
      ]);

      render(<App />);

      await waitFor(() => {
        expect(ndk.addExplicitRelay).toHaveBeenCalledWith('wss://relay1.test.com');
        expect(ndk.addExplicitRelay).toHaveBeenCalledWith('wss://relay2.test.com');
      });
    });

    it('calls ndk.connect() during initialization', async () => {
      render(<App />);

      await waitFor(() => {
        expect(ndk.connect).toHaveBeenCalled();
      });
    });

    it('handles relay load errors gracefully', async () => {
      (loadRelays as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      const { getByText } = render(<App />);

      // App should still render (shows LoginScreen because no user)
      await waitFor(() => {
        expect(getByText('Welcome to Eventinel')).toBeTruthy();
      });
    });

    it('handles no saved relays', async () => {
      (loadRelays as jest.Mock).mockResolvedValue([]);

      const { getByText } = render(<App />);

      await waitFor(() => {
        // App should still initialize
        expect(getByText('Welcome to Eventinel')).toBeTruthy();
        // addExplicitRelay should not be called
        expect(ndk.addExplicitRelay).not.toHaveBeenCalled();
      });
    });
  });

  // =============================================================================
  // LOADING STATE TESTS
  // =============================================================================

  describe('Loading States', () => {
    it('returns null initially while loading', () => {
      // This tests the isReady state before initialization completes
      // The App returns null when !isReady

      // We need to delay the relay loading to test this
      let resolveRelays: (value: string[]) => void;
      (loadRelays as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolveRelays = resolve;
        })
      );

      const { toJSON } = render(<App />);

      // Initially should render nothing (null)
      expect(toJSON()).toBeNull();

      // Now resolve the relay loading
      resolveRelays!([]);
    });

    it('renders content after initialization completes', async () => {
      mockNDKHooks.setCurrentUser(null);

      const { getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText('Welcome to Eventinel')).toBeTruthy();
      });
    });
  });

  // =============================================================================
  // NAVIGATION STRUCTURE TESTS (when authenticated)
  // =============================================================================

  describe('Navigation Structure', () => {
    beforeEach(() => {
      mockNDKHooks.setCurrentUser({
        pubkey: 'auth_user',
        profile: { displayName: 'Auth User' },
      });
    });

    it('renders NavigationContainer when authenticated', async () => {
      // The NavigationContainer is mocked, but we can verify
      // that we're not showing LoginScreen
      const { queryByText } = render(<App />);

      await waitFor(() => {
        expect(queryByText('Welcome to Eventinel')).toBeNull();
      });
    });
  });

  // =============================================================================
  // SESSION PERSISTENCE TESTS
  // =============================================================================

  describe('Session Persistence', () => {
    it('enables session monitoring on mount', async () => {
      render(<App />);

      await waitFor(() => {
        expect(useSessionMonitor).toHaveBeenCalled();
      });
    });

    it('passes profile:true to session monitor for auto-fetching', async () => {
      render(<App />);

      await waitFor(() => {
        expect(useSessionMonitor).toHaveBeenCalledWith(
          expect.objectContaining({ profile: true })
        );
      });
    });
  });
});
