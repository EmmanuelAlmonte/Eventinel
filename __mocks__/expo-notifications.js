/**
 * Mock for expo-notifications
 */

const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined',
};

module.exports = {
  PermissionStatus,
  AndroidImportance: {
    MAX: 5,
  },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ status: PermissionStatus.UNDETERMINED })),
  requestPermissionsAsync: jest.fn(async () => ({ status: PermissionStatus.GRANTED })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[TEST]' })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
};
