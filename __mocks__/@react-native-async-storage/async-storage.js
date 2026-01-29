/**
 * Mock for @react-native-async-storage/async-storage
 *
 * Provides an in-memory implementation for testing.
 */

let mockStorage = {};

const AsyncStorage = {
  setItem: jest.fn(async (key, value) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn(async (key) => {
    return Promise.resolve(mockStorage[key] ?? null);
  }),
  removeItem: jest.fn(async (key) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
  clear: jest.fn(async () => {
    mockStorage = {};
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(async () => {
    return Promise.resolve(Object.keys(mockStorage));
  }),
  multiGet: jest.fn(async (keys) => {
    return Promise.resolve(keys.map((key) => [key, mockStorage[key] ?? null]));
  }),
  multiSet: jest.fn(async (keyValuePairs) => {
    keyValuePairs.forEach(([key, value]) => {
      mockStorage[key] = value;
    });
    return Promise.resolve();
  }),
  multiRemove: jest.fn(async (keys) => {
    keys.forEach((key) => {
      delete mockStorage[key];
    });
    return Promise.resolve();
  }),
  // Helper for tests to reset storage
  __resetStorage: () => {
    mockStorage = {};
  },
  // Helper for tests to get raw storage
  __getStorage: () => mockStorage,
};

module.exports = AsyncStorage;
