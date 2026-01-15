/**
 * Jest Configuration for Eventinel Mobile
 *
 * Configured for Expo 53 + React Native 0.79 with TypeScript
 */

module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',

  // Transform TypeScript files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },

  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Setup files
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest.setup.js',
  ],

  // Module name mapping for path aliases and native modules
  moduleNameMapper: {
    // Mock native modules that don't work in Jest
    '^react-native-get-random-values$': '<rootDir>/__mocks__/react-native-get-random-values.js',
    '^expo-secure-store$': '<rootDir>/__mocks__/expo-secure-store.js',
    '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.js',
    '^expo-nip55$': '<rootDir>/__mocks__/expo-nip55.js',

    // Mock the NDK mobile package
    '^@nostr-dev-kit/mobile$': '<rootDir>/__mocks__/@nostr-dev-kit/mobile.ts',
  },

  // Ignore patterns - exclude documentation and build folders
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
    '<rootDir>/.expo/',
    '<rootDir>/ndk-docs/',
    '<rootDir>/do/',
    '<rootDir>/docs/',
    '<rootDir>/auth-implementation/',
  ],

  // Only look for tests in these directories
  roots: ['<rootDir>/__tests__'],

  // Transform ignore patterns - process these modules
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@nostr-dev-kit/.*|@rneui/.*|@rnmapbox/.*)',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'screens/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'App.tsx',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__mocks__/**',
    '!**/__tests__/**',
  ],

  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
    // Higher thresholds for auth-critical files
    './screens/LoginScreen.tsx': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,
};
