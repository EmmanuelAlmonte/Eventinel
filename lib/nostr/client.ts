/**
 * Eventinel NDK Client
 *
 * Singleton NDK instance with browser-only Dexie caching.
 * Handles relay configuration from environment variables.
 *
 * @see https://github.com/nostr-dev-kit/ndk
 */

import NDK from '@nostr-dev-kit/ndk';
import type { NDKCacheAdapter } from '@nostr-dev-kit/ndk';
import { getRelayUrls } from './config';

// Singleton instance
let ndkInstance: NDK | null = null;

/**
 * Options for creating an NDK instance
 */
export interface CreateNDKOptions {
  /** Custom relay URLs (overrides environment config) */
  relayUrls?: string[];
  /** Enable caching (default: true in browser, false on server) */
  enableCache?: boolean;
  /** Custom cache adapter */
  cacheAdapter?: NDKCacheAdapter;
  /** Auto-connect after creation (default: false) */
  autoConnect?: boolean;
}

/**
 * Detects if code is running in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Creates the Dexie cache adapter (browser-only)
 * Dynamically imports to avoid SSR issues
 *
 * Uses IndexedDB via Dexie for persistent event caching.
 * Requires @nostr-dev-kit/cache-dexie 2.7.8-beta.66 for
 * compatibility with NDK 3.0.0-beta.66
 */
async function createDexieCache(): Promise<NDKCacheAdapter | undefined> {
  if (!isBrowser()) {
    return undefined;
  }

  try {
    // Dynamic import for browser-only Dexie
    const { default: NDKCacheAdapterDexie } = await import(
      '@nostr-dev-kit/cache-dexie'
    );
    return new NDKCacheAdapterDexie({
      dbName: 'eventinel-cache',
    }) as unknown as NDKCacheAdapter;
  } catch (error) {
    console.warn('[NDK] Failed to initialize Dexie cache:', error);
    return undefined;
  }
}

/**
 * Creates a new NDK instance with Eventinel configuration
 *
 * @example
 * ```typescript
 * const ndk = await createNDK({ autoConnect: true });
 * ```
 */
export async function createNDK(
  options: CreateNDKOptions = {}
): Promise<NDK> {
  const {
    relayUrls,
    // DISABLED: Dexie cache causes memory bloat - events accumulate without eviction
    // Re-enable once proper cache eviction is implemented
    // See: https://github.com/nostr-dev-kit/ndk/issues/XXX
    enableCache = false, // Was: isBrowser()
    cacheAdapter,
    autoConnect = false,
  } = options;

  // Get relay URLs from options or environment
  const explicitRelayUrls = relayUrls || getRelayUrls();

  // Set up cache adapter
  let cache: NDKCacheAdapter | undefined = cacheAdapter;
  if (!cache && enableCache) {
    cache = await createDexieCache();
  }

  // Create NDK instance
  const ndk = new NDK({
    explicitRelayUrls,
    cacheAdapter: cache,
  });

  // Auto-connect if requested
  if (autoConnect) {
    await ndk.connect();
  }

  return ndk;
}

/**
 * Gets or creates the shared NDK singleton
 *
 * Use this for most client-side code to ensure a single connection pool.
 *
 * @example
 * ```typescript
 * const ndk = await getSharedNDK();
 * await ndk.connect();
 * ```
 */
export async function getSharedNDK(): Promise<NDK> {
  if (!ndkInstance) {
    ndkInstance = await createNDK();
  }
  return ndkInstance;
}

/**
 * Gets the shared NDK instance synchronously (if already initialized)
 *
 * @throws Error if NDK hasn't been initialized yet
 */
export function getSharedNDKSync(): NDK {
  if (!ndkInstance) {
    throw new Error(
      'NDK not initialized. Call getSharedNDK() first or use NDKProvider.'
    );
  }
  return ndkInstance;
}

/**
 * Sets the shared NDK instance (for testing or custom initialization)
 */
export function setSharedNDK(ndk: NDK): void {
  ndkInstance = ndk;
}

/**
 * Resets the shared NDK instance (for testing)
 */
export function resetSharedNDK(): void {
  if (ndkInstance) {
    // Disconnect all relays before resetting
    for (const relay of ndkInstance.pool.relays.values()) {
      relay.disconnect();
    }
  }
  ndkInstance = null;
}

/**
 * Connection state information
 */
export interface ConnectionState {
  /** Whether NDK is connected to at least one relay */
  isConnected: boolean;
  /** Number of connected relays */
  connectedCount: number;
  /** Total number of relays in pool */
  totalCount: number;
  /** Individual relay statuses */
  relays: Map<string, 'connected' | 'connecting' | 'disconnected'>;
}

/**
 * Gets the current connection state of the NDK instance
 */
export function getConnectionState(ndk: NDK): ConnectionState {
  const relays = new Map<string, 'connected' | 'connecting' | 'disconnected'>();
  let connectedCount = 0;

  for (const [url, relay] of ndk.pool.relays) {
    // NDK relay status: 0 = disconnected, 1 = connected, 2 = connecting
    const status =
      relay.status === 1
        ? 'connected'
        : relay.status === 2
          ? 'connecting'
          : 'disconnected';

    relays.set(url, status);

    if (status === 'connected') {
      connectedCount++;
    }
  }

  return {
    isConnected: connectedCount > 0,
    connectedCount,
    totalCount: ndk.pool.relays.size,
    relays,
  };
}
