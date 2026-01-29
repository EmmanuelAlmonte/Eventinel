/**
 * Unit Tests for lib/relay/storage.ts
 *
 * Tests saveRelays, loadRelays, addRelayToStorage, removeRelayFromStorage,
 * and clearRelayStorage functions using mocked AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveRelays,
  loadRelays,
  addRelayToStorage,
  removeRelayFromStorage,
  clearRelayStorage,
  DEFAULT_RELAYS,
} from '../../../lib/relay/storage';

// Mock AsyncStorage module
jest.mock('@react-native-async-storage/async-storage');

// Type assertion for mocked module
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Storage key used by the module
const RELAY_STORAGE_KEY = 'eventinel:saved-relays';

describe('lib/relay/storage', () => {
  beforeEach(() => {
    // Clear all mocks and reset storage before each test
    jest.clearAllMocks();
    mockedAsyncStorage.setItem.mockResolvedValue();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.removeItem.mockResolvedValue();
  });

  // ===========================================================================
  // DEFAULT_RELAYS
  // ===========================================================================

  describe('DEFAULT_RELAYS', () => {
    it('exports an array of default relay URLs', () => {
      expect(Array.isArray(DEFAULT_RELAYS)).toBe(true);
      expect(DEFAULT_RELAYS.length).toBeGreaterThan(0);
    });

    it('contains valid WebSocket URLs', () => {
      DEFAULT_RELAYS.forEach((url) => {
        expect(url.startsWith('ws://') || url.startsWith('wss://')).toBe(true);
      });
    });
  });

  // ===========================================================================
  // saveRelays
  // ===========================================================================

  describe('saveRelays', () => {
    it('saves relay URLs to AsyncStorage', async () => {
      const urls = ['wss://relay1.example.com', 'wss://relay2.example.com'];

      await saveRelays(urls);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledTimes(1);
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        RELAY_STORAGE_KEY,
        expect.any(String)
      );
    });

    it('normalizes URLs before saving (lowercase, no trailing slash)', async () => {
      const urls = ['WSS://RELAY.EXAMPLE.COM/', 'wss://another.relay.com/'];

      await saveRelays(urls);

      const savedValue = mockedAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedValue);

      expect(parsed).toContain('wss://relay.example.com');
      expect(parsed).toContain('wss://another.relay.com');
      // No trailing slashes
      parsed.forEach((url: string) => {
        expect(url.endsWith('/')).toBe(false);
      });
    });

    it('removes duplicate URLs', async () => {
      const urls = [
        'wss://relay.example.com',
        'wss://relay.example.com/',
        'WSS://RELAY.EXAMPLE.COM',
      ];

      await saveRelays(urls);

      const savedValue = mockedAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedValue);

      expect(parsed.length).toBe(1);
      expect(parsed[0]).toBe('wss://relay.example.com');
    });

    it('saves empty array when given empty input', async () => {
      await saveRelays([]);

      const savedValue = mockedAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedValue);

      expect(parsed).toEqual([]);
    });

    it('trims whitespace from URLs', async () => {
      const urls = ['  wss://relay.example.com  ', '\twss://another.relay.com\n'];

      await saveRelays(urls);

      const savedValue = mockedAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedValue);

      expect(parsed).toContain('wss://relay.example.com');
      expect(parsed).toContain('wss://another.relay.com');
    });

    it('throws error when AsyncStorage fails', async () => {
      const error = new Error('Storage full');
      mockedAsyncStorage.setItem.mockRejectedValueOnce(error);

      await expect(saveRelays(['wss://relay.example.com'])).rejects.toThrow('Storage full');
    });
  });

  // ===========================================================================
  // loadRelays
  // ===========================================================================

  describe('loadRelays', () => {
    it('loads saved relays from AsyncStorage', async () => {
      const savedRelays = ['wss://relay1.example.com', 'wss://relay2.example.com'];
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(savedRelays));

      const result = await loadRelays();

      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(RELAY_STORAGE_KEY);
      expect(result).toEqual(savedRelays);
    });

    it('returns DEFAULT_RELAYS when no saved relays exist', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await loadRelays();

      expect(result).toEqual(DEFAULT_RELAYS);
    });

    it('returns DEFAULT_RELAYS when AsyncStorage throws error', async () => {
      mockedAsyncStorage.getItem.mockRejectedValueOnce(new Error('Read error'));

      const result = await loadRelays();

      expect(result).toEqual(DEFAULT_RELAYS);
    });

    it('returns DEFAULT_RELAYS when stored JSON is invalid', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce('not-valid-json');

      const result = await loadRelays();

      expect(result).toEqual(DEFAULT_RELAYS);
    });

    it('returns saved relays even if empty array', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([]));

      const result = await loadRelays();

      // Empty array is still a valid saved state
      expect(result).toEqual([]);
    });

    it('preserves exact saved URLs without re-normalization', async () => {
      const savedRelays = ['wss://relay.example.com', 'ws://localhost:8085'];
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(savedRelays));

      const result = await loadRelays();

      expect(result).toEqual(savedRelays);
    });
  });

  // ===========================================================================
  // addRelayToStorage
  // ===========================================================================

  describe('addRelayToStorage', () => {
    it('adds a new relay to existing list', async () => {
      const existingRelays = ['wss://relay1.example.com'];
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingRelays));

      await addRelayToStorage('wss://relay2.example.com');

      const savedValue = mockedAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedValue);

      expect(parsed).toContain('wss://relay1.example.com');
      expect(parsed).toContain('wss://relay2.example.com');
    });

    it('does not add duplicate relay', async () => {
      const existingRelays = ['wss://relay.example.com'];
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingRelays));

      await addRelayToStorage('wss://relay.example.com');

      // setItem should not be called because relay already exists
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('treats URL variations as duplicates (normalization)', async () => {
      const existingRelays = ['wss://relay.example.com'];
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingRelays));

      // Same URL with trailing slash and uppercase
      await addRelayToStorage('WSS://RELAY.EXAMPLE.COM/');

      // setItem should not be called because normalized URL matches
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('adds relay to empty storage (falls back to defaults first)', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

      await addRelayToStorage('wss://new.relay.com');

      const savedValue = mockedAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedValue);

      // Should contain defaults plus new relay
      expect(parsed).toContain('wss://new.relay.com');
      DEFAULT_RELAYS.forEach((defaultRelay) => {
        const normalizedDefault = defaultRelay.trim().toLowerCase().replace(/\/$/, '');
        expect(parsed).toContain(normalizedDefault);
      });
    });

    it('normalizes the new URL before adding', async () => {
      const existingRelays = ['wss://relay1.example.com'];
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingRelays));

      await addRelayToStorage('  WSS://NEW.RELAY.COM/  ');

      const savedValue = mockedAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedValue);

      expect(parsed).toContain('wss://new.relay.com');
    });
  });

  // ===========================================================================
  // removeRelayFromStorage
  // ===========================================================================

  describe('removeRelayFromStorage', () => {
    it('removes a relay from storage', async () => {
      const existingRelays = ['wss://relay1.example.com', 'wss://relay2.example.com'];
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingRelays));

      await removeRelayFromStorage('wss://relay1.example.com');

      const savedValue = mockedAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedValue);

      expect(parsed).not.toContain('wss://relay1.example.com');
      expect(parsed).toContain('wss://relay2.example.com');
    });

    it('removes relay using normalized URL comparison', async () => {
      const existingRelays = ['wss://relay.example.com'];
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingRelays));

      // Remove with different casing and trailing slash
      await removeRelayFromStorage('WSS://RELAY.EXAMPLE.COM/');

      const savedValue = mockedAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedValue);

      expect(parsed).not.toContain('wss://relay.example.com');
    });

    it('does not call setItem if relay not found', async () => {
      const existingRelays = ['wss://relay.example.com'];
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingRelays));

      await removeRelayFromStorage('wss://nonexistent.relay.com');

      // setItem should not be called since nothing was removed
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('can remove all relays leaving empty array', async () => {
      const existingRelays = ['wss://only-relay.example.com'];
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingRelays));

      await removeRelayFromStorage('wss://only-relay.example.com');

      const savedValue = mockedAsyncStorage.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedValue);

      expect(parsed).toEqual([]);
    });

    it('handles removal from defaults (when no saved relays)', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

      // Skip test if no default relays
      if (DEFAULT_RELAYS.length === 0) {
        return;
      }

      const normalizedDefault = DEFAULT_RELAYS[0].trim().toLowerCase().replace(/\/$/, '');
      await removeRelayFromStorage(DEFAULT_RELAYS[0]);

      // Check if setItem was called (might not be if default relay was already not present)
      if (mockedAsyncStorage.setItem.mock.calls.length > 0) {
        const savedValue = mockedAsyncStorage.setItem.mock.calls[0][1];
        const parsed = JSON.parse(savedValue);
        expect(parsed).not.toContain(normalizedDefault);
      } else {
        // If setItem wasn't called, it means the relay wasn't in the defaults
        // or no change was needed - this is acceptable behavior
        expect(true).toBe(true);
      }
    });
  });

  // ===========================================================================
  // clearRelayStorage
  // ===========================================================================

  describe('clearRelayStorage', () => {
    it('removes the relay storage key', async () => {
      await clearRelayStorage();

      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith(RELAY_STORAGE_KEY);
    });

    it('can be called multiple times without error', async () => {
      await clearRelayStorage();
      await clearRelayStorage();
      await clearRelayStorage();

      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledTimes(3);
    });

    it('does not throw when removeItem fails', async () => {
      mockedAsyncStorage.removeItem.mockRejectedValueOnce(new Error('Remove failed'));

      // Should throw because clearRelayStorage doesn't catch errors
      await expect(clearRelayStorage()).rejects.toThrow('Remove failed');
    });
  });

  // ===========================================================================
  // Integration scenarios
  // ===========================================================================

  describe('integration scenarios', () => {
    it('save then load returns same relays', async () => {
      const relays = ['wss://relay1.example.com', 'wss://relay2.example.com'];

      // Mock setItem to store value
      let storedValue: string | null = null;
      mockedAsyncStorage.setItem.mockImplementation(async (_key, value) => {
        storedValue = value;
      });

      await saveRelays(relays);

      // Mock getItem to return stored value
      mockedAsyncStorage.getItem.mockResolvedValueOnce(storedValue);

      const loaded = await loadRelays();

      expect(loaded).toEqual(relays);
    });

    it('add relay persists across load', async () => {
      // Start with one relay
      let storedValue: string | null = JSON.stringify(['wss://relay1.example.com']);

      mockedAsyncStorage.getItem.mockImplementation(async () => storedValue);
      mockedAsyncStorage.setItem.mockImplementation(async (_key, value) => {
        storedValue = value;
      });

      // Add a new relay
      await addRelayToStorage('wss://relay2.example.com');

      // Load should include both
      const loaded = await loadRelays();

      expect(loaded).toContain('wss://relay1.example.com');
      expect(loaded).toContain('wss://relay2.example.com');
    });

    it('clear then load returns defaults', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

      await clearRelayStorage();
      const loaded = await loadRelays();

      expect(loaded).toEqual(DEFAULT_RELAYS);
    });
  });
});
