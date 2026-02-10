/**
 * Mock for expo-image-picker
 */

module.exports = {
  MediaTypeOptions: {
    All: 'All',
    Images: 'Images',
    Videos: 'Videos',
  },

  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),

  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: true,
    assets: [],
  })),
};

