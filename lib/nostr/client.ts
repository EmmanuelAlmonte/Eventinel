/**
 * Eventinel NDK Client
 *
 * Singleton NDK instance for React Native.
 * Handles relay configuration from environment variables.
 *
 * NOTE: For mobile apps, prefer using lib/ndk.ts which includes
 * SQLite caching. This module provides a factory function for
 * creating additional NDK instances if needed.
 *
 * @see https://github.com/nostr-dev-kit/ndk
 */

import NDK, { type NDKCacheAdapter } from '@nostr-dev-kit/mobile';
import { getRelayUrls } from './config';

// Singleton instance
let ndkInstance: NDK | null = null;

/**
 * Options for creating an NDK instance
 */
export interface CreateNDKOptions {
  /** Custom relay URLs (overrides environment config) */
  relayUrls?: string[];
  /** Custom cache adapter (e.g., NDKCacheAdapterSqlite from NDK mobile) */
  cacheAdapter?: NDKCacheAdapter;
  /** Auto-connect after creation (default: false) */
  autoConnect?: boolean;
}

/**
 * Creates a new NDK instance with Eventinel configuration
 *
 * @example
 * ```typescript
 * import { NDKCacheAdapterSqlite } from '@nostr-dev-kit/mobile';
 *
 * const cacheAdapter = new NDKCacheAdapterSqlite('my-app.db');
 * await cacheAdapter.initialize();
 *
 * const ndk = await createNDK({
 *   cacheAdapter,
 *   autoConnect: true
 * });
 * ```
 */
export async function createNDK(
  options: CreateNDKOptions = {}
): Promise<NDK> {
  const {
    relayUrls,
    cacheAdapter,
    autoConnect = false,
  } = options;

  // Get relay URLs from options or environment
  const explicitRelayUrls = relayUrls || getRelayUrls();

  // Create NDK instance
  const ndk = new NDK({
    explicitRelayUrls,
    cacheAdapter,
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
