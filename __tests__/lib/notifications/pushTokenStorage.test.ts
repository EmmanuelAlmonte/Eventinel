/**
 * Unit Tests for lib/notifications/pushTokenStorage.ts
 *
 * Tests saveExpoPushToken, loadExpoPushToken, and clearExpoPushToken functions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveExpoPushToken,
  loadExpoPushToken,
  clearExpoPushToken,
} from '../../../lib/notifications/pushTokenStorage';

// Mock AsyncStorage module
jest.mock('@react-native-async-storage/async-storage');

// Type assertion for mocked module
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Storage key used by the module
const PUSH_TOKEN_STORAGE_KEY = '@eventinel/expoPushToken';

describe('lib/notifications/pushTokenStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.setItem.mockResolvedValue();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.removeItem.mockResolvedValue();
  });

  // ===========================================================================
  // saveExpoPushToken Tests
  // ===========================================================================

  describe('saveExpoPushToken', () => {
    it('saves token to AsyncStorage with correct key', async () => {
      const token = 'ExponentPushToken[ABC123XYZ]';

      await saveExpoPushToken(token);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledTimes(1);
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        PUSH_TOKEN_STORAGE_KEY,
        token
      );
    });

    it('saves different token formats', async () => {
      const tokens = [
        'ExponentPushToken[ABC123]',
        'ExponentPushToken[a1b2c3d4e5f6]',
        'ExponentPushToken[UPPERCASE]',
        'ExponentPushToken[with-dashes-123]',
      ];

      for (const token of tokens) {
        await saveExpoPushToken(token);
        expect(mockedAsyncStorage.setItem).toHaveBeenLastCalledWith(
          PUSH_TOKEN_STORAGE_KEY,
          token
        );
      }
    });

    it('overwrites existing token', async () => {
      await saveExpoPushToken('ExponentPushToken[OLD]');
      await saveExpoPushToken('ExponentPushToken[NEW]');

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledTimes(2);
      expect(mockedAsyncStorage.setItem).toHaveBeenLastCalledWith(
        PUSH_TOKEN_STORAGE_KEY,
        'ExponentPushToken[NEW]'
      );
    });

    it('saves empty string (edge case)', async () => {
      await saveExpoPushToken('');

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        PUSH_TOKEN_STORAGE_KEY,
        ''
      );
    });

    it('propagates error when AsyncStorage fails', async () => {
      const error = new Error('Storage write failed');
      mockedAsyncStorage.setItem.mockRejectedValueOnce(error);

      await expect(saveExpoPushToken('token')).rejects.toThrow('Storage write failed');
    });

    it('handles long tokens', async () => {
      const longToken = 'ExponentPushToken[' + 'a'.repeat(200) + ']';

      await saveExpoPushToken(longToken);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        PUSH_TOKEN_STORAGE_KEY,
        longToken
      );
    });

    it('handles special characters in token', async () => {
      const specialToken = 'ExponentPushToken[abc+/=123]';

      await saveExpoPushToken(specialToken);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        PUSH_TOKEN_STORAGE_KEY,
        specialToken
      );
    });
  });

  // ===========================================================================
  // loadExpoPushToken Tests
  // ===========================================================================

  describe('loadExpoPushToken', () => {
    it('loads token from AsyncStorage', async () => {
      const storedToken = 'ExponentPushToken[STORED123]';
      mockedAsyncStorage.getItem.mockResolvedValueOnce(storedToken);

      const result = await loadExpoPushToken();

      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(PUSH_TOKEN_STORAGE_KEY);
      expect(result).toBe(storedToken);
    });

    it('returns null when no token is stored', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await loadExpoPushToken();

      expect(result).toBeNull();
    });

    it('returns empty string if empty string was stored', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce('');

      const result = await loadExpoPushToken();

      expect(result).toBe('');
    });

    it('propagates error when AsyncStorage fails', async () => {
      const error = new Error('Storage read failed');
      mockedAsyncStorage.getItem.mockRejectedValueOnce(error);

      await expect(loadExpoPushToken()).rejects.toThrow('Storage read failed');
    });

    it('loads the exact token that was stored (no transformation)', async () => {
      const token = '  ExponentPushToken[SPACES]  ';
      mockedAsyncStorage.getItem.mockResolvedValueOnce(token);

      const result = await loadExpoPushToken();

      expect(result).toBe(token);
    });
  });

  // ===========================================================================
  // clearExpoPushToken Tests
  // ===========================================================================

  describe('clearExpoPushToken', () => {
    it('removes token from AsyncStorage', async () => {
      await clearExpoPushToken();

      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith(PUSH_TOKEN_STORAGE_KEY);
    });

    it('can be called multiple times without error', async () => {
      await clearExpoPushToken();
      await clearExpoPushToken();
      await clearExpoPushToken();

      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledTimes(3);
    });

    it('propagates error when AsyncStorage fails', async () => {
      const error = new Error('Storage remove failed');
      mockedAsyncStorage.removeItem.mockRejectedValueOnce(error);

      await expect(clearExpoPushToken()).rejects.toThrow('Storage remove failed');
    });

    it('does not throw when token does not exist', async () => {
      // removeItem should not throw even if key doesn't exist
      mockedAsyncStorage.removeItem.mockResolvedValueOnce();

      await expect(clearExpoPushToken()).resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // Integration Scenarios
  // ===========================================================================

  describe('integration scenarios', () => {
    it('save then load returns the same token', async () => {
      let storedToken: string | null = null;

      mockedAsyncStorage.setItem.mockImplementation(async (_key, value) => {
        storedToken = value;
      });
      mockedAsyncStorage.getItem.mockImplementation(async () => storedToken);

      const originalToken = 'ExponentPushToken[TEST123]';

      await saveExpoPushToken(originalToken);
      const loadedToken = await loadExpoPushToken();

      expect(loadedToken).toBe(originalToken);
    });

    it('clear then load returns null', async () => {
      let storedToken: string | null = 'ExponentPushToken[EXISTING]';

      mockedAsyncStorage.removeItem.mockImplementation(async () => {
        storedToken = null;
      });
      mockedAsyncStorage.getItem.mockImplementation(async () => storedToken);

      await clearExpoPushToken();
      const loadedToken = await loadExpoPushToken();

      expect(loadedToken).toBeNull();
    });

    it('save overwrites previous token', async () => {
      let storedToken: string | null = null;

      mockedAsyncStorage.setItem.mockImplementation(async (_key, value) => {
        storedToken = value;
      });
      mockedAsyncStorage.getItem.mockImplementation(async () => storedToken);

      await saveExpoPushToken('ExponentPushToken[FIRST]');
      await saveExpoPushToken('ExponentPushToken[SECOND]');
      const loadedToken = await loadExpoPushToken();

      expect(loadedToken).toBe('ExponentPushToken[SECOND]');
    });

    it('full lifecycle: save, load, clear, load', async () => {
      let storedToken: string | null = null;

      mockedAsyncStorage.setItem.mockImplementation(async (_key, value) => {
        storedToken = value;
      });
      mockedAsyncStorage.getItem.mockImplementation(async () => storedToken);
      mockedAsyncStorage.removeItem.mockImplementation(async () => {
        storedToken = null;
      });

      const token = 'ExponentPushToken[LIFECYCLE]';

      // Save
      await saveExpoPushToken(token);

      // Load (should return token)
      let loaded = await loadExpoPushToken();
      expect(loaded).toBe(token);

      // Clear
      await clearExpoPushToken();

      // Load again (should return null)
      loaded = await loadExpoPushToken();
      expect(loaded).toBeNull();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('handles concurrent saves', async () => {
      const tokens = ['Token1', 'Token2', 'Token3'];

      // Simulate concurrent saves
      await Promise.all(tokens.map((t) => saveExpoPushToken(t)));

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledTimes(3);
    });

    it('handles undefined return from getItem gracefully', async () => {
      // Some AsyncStorage implementations might return undefined
      mockedAsyncStorage.getItem.mockResolvedValueOnce(undefined as any);

      const result = await loadExpoPushToken();

      // Should handle undefined similarly to null
      expect(result).toBeFalsy();
    });

    it('uses consistent storage key across all operations', async () => {
      await saveExpoPushToken('token');
      await loadExpoPushToken();
      await clearExpoPushToken();

      // All operations should use the same key
      expect(mockedAsyncStorage.setItem.mock.calls[0][0]).toBe(PUSH_TOKEN_STORAGE_KEY);
      expect(mockedAsyncStorage.getItem.mock.calls[0][0]).toBe(PUSH_TOKEN_STORAGE_KEY);
      expect(mockedAsyncStorage.removeItem.mock.calls[0][0]).toBe(PUSH_TOKEN_STORAGE_KEY);
    });
  });

  // ===========================================================================
  // Token Format Tests
  // ===========================================================================

  describe('token format handling', () => {
    it('stores Expo push token format correctly', async () => {
      const expoToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

      await saveExpoPushToken(expoToken);
      mockedAsyncStorage.getItem.mockResolvedValueOnce(expoToken);

      const loaded = await loadExpoPushToken();

      expect(loaded).toBe(expoToken);
      expect(loaded).toMatch(/^ExponentPushToken\[.+\]$/);
    });

    it('handles APNs token format (iOS native)', async () => {
      // APNs tokens are typically hex strings
      const apnsToken = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

      await saveExpoPushToken(apnsToken);
      mockedAsyncStorage.getItem.mockResolvedValueOnce(apnsToken);

      const loaded = await loadExpoPushToken();

      expect(loaded).toBe(apnsToken);
    });

    it('handles FCM token format (Android native)', async () => {
      // FCM tokens are typically long base64-like strings
      const fcmToken =
        'dGhpcyBpcyBhIHRlc3QgRkNNIHRva2VuIHRoYXQgaXMgcXVpdGUgbG9uZw:APA91b_test_token_here';

      await saveExpoPushToken(fcmToken);
      mockedAsyncStorage.getItem.mockResolvedValueOnce(fcmToken);

      const loaded = await loadExpoPushToken();

      expect(loaded).toBe(fcmToken);
    });
  });
});
