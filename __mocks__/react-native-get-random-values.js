/**
 * Mock for react-native-get-random-values
 *
 * This polyfill provides crypto.getRandomValues for React Native.
 * In tests, we provide a simple deterministic implementation.
 */

// Ensure global crypto exists
if (typeof global.crypto !== 'object') {
  global.crypto = {};
}

// Provide a mock getRandomValues implementation
if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = function (array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

module.exports = {};
