/**
 * Relay Persistence Storage
 *
 * Handles saving and loading relay URLs to/from AsyncStorage.
 *
 * @module lib/relay/storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const RELAY_STORAGE_KEY = 'eventinel:saved-relays';

/**
 * Default relays to use if no saved relays exist.
 * These are reliable, well-maintained relays.
 */
export const DEFAULT_RELAYS = [
  'ws://10.0.2.2:8085/'
];

/**
 * Save relay URLs to persistent storage.
 *
 * @example
 * ```typescript
 * await saveRelays(['ws://10.0.0.197:8085']);
 * ```
 */
export async function saveRelays(urls: string[]): Promise<void> {
  try {
    // Normalize and deduplicate
    const normalized = [...new Set(urls.map(normalizeUrl))];
    await AsyncStorage.setItem(RELAY_STORAGE_KEY, JSON.stringify(normalized));
    console.log('[Relay Storage] Saved', normalized.length, 'relays');
  } catch (error) {
    console.error('[Relay Storage] Failed to save relays:', error);
    throw error;
  }
}

/**
 * Load relay URLs from persistent storage.
 * Returns default relays if none saved.
 *
 * @example
 * ```typescript
 * const relays = await loadRelays();
 * // Returns: ['ws://10.0.0.197:8085', ...]
 * ```
 */
export async function loadRelays(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(RELAY_STORAGE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      console.log('[Relay Storage] Loaded', parsed.length, 'saved relays');
      return parsed;
    }

    console.log('[Relay Storage] No saved relays, using defaults');
    return DEFAULT_RELAYS;
  } catch (error) {
    console.error('[Relay Storage] Failed to load relays:', error);
    return DEFAULT_RELAYS;
  }
}

/**
 * Add a single relay to storage (appends to existing list).
 *
 * @example
 * ```typescript
 * await addRelayToStorage('wss://new-relay.example.com');
 * ```
 */
export async function addRelayToStorage(url: string): Promise<void> {
  const current = await loadRelays();
  const normalized = normalizeUrl(url);

  // Don't add duplicates
  if (current.includes(normalized)) {
    console.log('[Relay Storage] Relay already saved:', normalized);
    return;
  }

  await saveRelays([...current, normalized]);
}

/**
 * Remove a single relay from storage.
 *
 * @example
 * ```typescript
 * await removeRelayFromStorage('wss://old-relay.example.com');
 * ```
 */
export async function removeRelayFromStorage(url: string): Promise<void> {
  const current = await loadRelays();
  const normalized = normalizeUrl(url);
  const updated = current.filter((r) => r !== normalized);

  if (updated.length < current.length) {
    await saveRelays(updated);
    console.log('[Relay Storage] Removed relay:', normalized);
  }
}

/**
 * Clear all saved relays from storage.
 */
export async function clearRelayStorage(): Promise<void> {
  await AsyncStorage.removeItem(RELAY_STORAGE_KEY);
  console.log('[Relay Storage] Cleared all saved relays');
}

/**
 * Normalize relay URL for consistent comparison.
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes trailing slash
 */
function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/$/, '');
}
