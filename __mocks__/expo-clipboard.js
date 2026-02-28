/**
 * Mock for expo-clipboard
 */

module.exports = {
  setStringAsync: jest.fn(async () => {}),
  getStringAsync: jest.fn(async () => ''),
  hasStringAsync: jest.fn(async () => false),
};
