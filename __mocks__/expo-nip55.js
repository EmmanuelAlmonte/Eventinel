/**
 * Mock for expo-nip55
 *
 * Provides mock implementation of NIP-55 (Android signer) functionality.
 * This module handles communication with external signer apps like Amber.
 */

// Mock signer apps available on the device
const mockSignerApps = [
  {
    packageName: 'com.greenart7c3.nostrsigner',
    name: 'Amber',
    icon: null,
  },
];

module.exports = {
  // Check if NIP-55 is available on this platform
  isAvailable: jest.fn(() => true),

  // Get list of installed signer apps
  getSignerApps: jest.fn(() => mockSignerApps),

  // Launch signer app for authentication
  launchSignerApp: jest.fn((packageName) => {
    const app = mockSignerApps.find((a) => a.packageName === packageName);
    if (!app) {
      return Promise.reject(new Error(`Signer app ${packageName} not found`));
    }
    return Promise.resolve({ pubkey: 'mock_pubkey_from_' + packageName });
  }),

  // Request signing from signer app
  requestSign: jest.fn((packageName, event) => {
    return Promise.resolve({
      ...event,
      sig: 'mock_sig_from_' + packageName,
    });
  }),

  // Get public key from signer app
  getPublicKey: jest.fn((packageName) => {
    return Promise.resolve('mock_pubkey_from_' + packageName);
  }),

  // Test helpers
  __setSignerApps: (apps) => {
    mockSignerApps.length = 0;
    mockSignerApps.push(...apps);
  },

  __reset: () => {
    mockSignerApps.length = 0;
    mockSignerApps.push({
      packageName: 'com.greenart7c3.nostrsigner',
      name: 'Amber',
      icon: null,
    });
  },
};
