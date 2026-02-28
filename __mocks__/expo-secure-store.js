/**
 * Mock for expo-secure-store
 *
 * Provides an in-memory implementation of SecureStore for testing.
 * Values are stored in a Map and persist for the duration of the test.
 */

const store = new Map();

module.exports = {
  // Get a value from secure storage
  getItemAsync: jest.fn(async (key) => {
    return store.get(key) || null;
  }),

  // Set a value in secure storage
  setItemAsync: jest.fn(async (key, value) => {
    store.set(key, value);
  }),

  // Delete a value from secure storage
  deleteItemAsync: jest.fn(async (key) => {
    store.delete(key);
  }),

  // Check if a key exists
  isAvailableAsync: jest.fn(async () => true),

  // Clear all stored values (useful in beforeEach)
  __clear: () => {
    store.clear();
  },

  // Get all stored values (useful for debugging)
  __getStore: () => new Map(store),

  // Security options (constants)
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
  ALWAYS: 'ALWAYS',
  ALWAYS_THIS_DEVICE_ONLY: 'ALWAYS_THIS_DEVICE_ONLY',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY',
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
};
