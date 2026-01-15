/**
 * Jest Setup File for Eventinel Mobile
 *
 * This file runs before each test file and sets up:
 * - Global mocks for React Native modules
 * - NDK hook mocks with controllable state
 * - Platform-specific configurations
 */

import 'react-native-gesture-handler/jestSetup';

// Silence console warnings during tests (optional)
// console.warn = jest.fn();
// console.error = jest.fn();

// Mock React Native's Platform module
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'android', // Default to Android for NIP-55 tests
  select: jest.fn((obj) => obj.android || obj.default),
}));

// Mock Alert module
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn((title, message, buttons) => {
        // Store the last alert for assertions
        global.__lastAlert = { title, message, buttons };
        // Auto-press the destructive button if exists (for logout tests)
        const destructiveBtn = buttons?.find((b) => b.style === 'destructive');
        if (destructiveBtn?.onPress) {
          // Don't auto-press - let tests control this
        }
      }),
    },
  };
});

// Mock Animated module to avoid timing issues
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock StatusBar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Mock NavigationContainer
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    NavigationContainer: ({ children }) => children,
  };
});

// Mock Material Top Tabs
jest.mock('@react-navigation/material-top-tabs', () => ({
  createMaterialTopTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Global test utilities
global.mockNDKUser = (pubkey, profile = {}) => ({
  pubkey,
  profile: {
    displayName: profile.displayName || 'Test User',
    name: profile.name || 'testuser',
    about: profile.about || 'Test bio',
    ...profile,
  },
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  global.__lastAlert = null;
});

// Clean up after each test
afterEach(() => {
  jest.restoreAllMocks();
});
