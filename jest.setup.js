/**
 * Jest Setup File for Eventinel Mobile
 *
 * This file runs before each test file and sets up:
 * - Global mocks for React Native modules
 * - NDK hook mocks with controllable state
 * - Platform-specific configurations
 */

import 'react-native-gesture-handler/jestSetup';
import '@testing-library/react-native/extend-expect';

// Silence console warnings during tests (optional)
// console.warn = jest.fn();
// console.error = jest.fn();

// Mock React Native's Alert - use spyOn approach after import
import { Alert } from 'react-native';

// Override Alert.alert to track calls
const originalAlert = Alert.alert;
Alert.alert = jest.fn((title, message, buttons) => {
  // Store the last alert for assertions
  global.__lastAlert = { title, message, buttons };
});

// Mock StatusBar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Mock SafeAreaProvider
jest.mock('react-native-safe-area-context', () => {
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Mock Mapbox (heavy native module)
jest.mock('@rnmapbox/maps', () => ({
  default: {},
  MapView: 'MapView',
  Camera: 'Camera',
  MarkerView: 'MarkerView',
  PointAnnotation: 'PointAnnotation',
  ShapeSource: 'ShapeSource',
  SymbolLayer: 'SymbolLayer',
  CircleLayer: 'CircleLayer',
  setAccessToken: jest.fn(),
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

// Helper to simulate pressing alert buttons
global.pressAlertButton = (buttonText) => {
  if (global.__lastAlert?.buttons) {
    const button = global.__lastAlert.buttons.find(
      (b) => b.text === buttonText || b.style === buttonText
    );
    if (button?.onPress) {
      button.onPress();
    }
  }
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  global.__lastAlert = null;
});

// Clean up after each test
afterEach(() => {
  jest.restoreAllMocks();
});
