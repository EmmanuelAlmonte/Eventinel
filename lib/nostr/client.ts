/**
 * Eventinel NDK Client
 *
 * NDK access helpers for React Native.
 * Uses the shared singleton from lib/ndk.ts.
 *
 * NOTE: This module intentionally does not create additional NDK instances.
 * It proxies access to the app-level singleton so connection/session state
 * remains centralized.
 *
 * @see https://github.com/nostr-dev-kit/ndk
 */

import type NDK from '@nostr-dev-kit/mobile';
import { type NDKCacheAdapter } from '@nostr-dev-kit/mobile';
import { getRelayUrls } from './config';
import { ndk as sharedNDK } from '../ndk';

// Singleton instance
let ndkInstance: NDK | null = sharedNDK;

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
 * Returns the shared NDK instance with optional connect behavior
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

  if (relayUrls || cacheAdapter) {
    const configuredRelays = getRelayUrls();
    console.warn(
      '[nostr/client] createNDK relayUrls/cacheAdapter overrides are ignored; using shared singleton from lib/ndk.ts',
      {
        relayUrlsProvided: Boolean(relayUrls),
        cacheAdapterProvided: Boolean(cacheAdapter),
        configuredRelayCount: configuredRelays.length,
      }
    );
  }

  const ndk = ndkInstance ?? sharedNDK;
  ndkInstance = ndk;

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
  const ndk = ndkInstance ?? sharedNDK;
  ndkInstance = ndk;
  return ndk;
}

/**
 * Gets the shared NDK instance synchronously (if already initialized)
 *
 * @throws Error if NDK hasn't been initialized yet
 */
export function getSharedNDKSync(): NDK {
  return ndkInstance ?? sharedNDK;
}

/**
 * Sets the shared NDK instance (for testing or custom initialization)
 */
export function setSharedNDK(ndk: NDK): void {
  if (ndk !== sharedNDK) {
    console.warn(
      '[nostr/client] setSharedNDK ignored; app uses singleton from lib/ndk.ts'
    );
    return;
  }
  ndkInstance = sharedNDK;
}

/**
 * Resets the shared NDK instance (for testing)
 */
export function resetSharedNDK(): void {
  // Keep the singleton identity stable; only disconnect active relays.
  const activeNdk = ndkInstance ?? sharedNDK;
  for (const relay of activeNdk.pool.relays.values()) {
    relay.disconnect();
  }
  ndkInstance = sharedNDK;
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
