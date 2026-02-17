/**
 * NDK Singleton Instance
 *
 * IMPORTANT: This file initializes NDK ONCE at module level to ensure
 * a singleton pattern. Import { ndk } from here in your screens.
 *
 * @module lib/ndk
 */

import NDK from '@nostr-dev-kit/mobile';
import { NDKCacheAdapterSqlite } from '@nostr-dev-kit/mobile';

const IS_PRODUCTION_BUILD = !__DEV__ && process.env.NODE_ENV === 'production';
const NON_PRODUCTION_RELAY_POLICY = Object.freeze({
  enableOutboxModel: false,
  autoConnectUserRelays: false,
});

if (
  !IS_PRODUCTION_BUILD &&
  (NON_PRODUCTION_RELAY_POLICY.enableOutboxModel ||
    NON_PRODUCTION_RELAY_POLICY.autoConnectUserRelays)
) {
  throw new Error(
    '[NDK] Non-production policy violation: outbox model and auto-connect user relays must stay disabled.'
  );
}

// Initialize SQLite cache adapter
const cacheAdapter = new NDKCacheAdapterSqlite('eventinel.db');
cacheAdapter.initialize(); // Create database tables

// Export cache adapter for debugging
export { cacheAdapter };

// Debug: Log cache stats on startup (async to avoid blocking)
if (__DEV__) {
  // Wait for DB to be ready before querying
  setTimeout(() => {
    try {
      const eventCount = cacheAdapter.db.getFirstSync(
        'SELECT COUNT(*) as count FROM events'
      ) as { count: number } | null;
      const incidentCount = cacheAdapter.db.getFirstSync(
        'SELECT COUNT(*) as count FROM events WHERE kind = 30911'
      ) as { count: number } | null;
      const pageSizeRow = cacheAdapter.db.getFirstSync(
        'PRAGMA page_size'
      ) as { page_size: number } | null;
      const pageCountRow = cacheAdapter.db.getFirstSync(
        'PRAGMA page_count'
      ) as { page_count: number } | null;
      const freeListRow = cacheAdapter.db.getFirstSync(
        'PRAGMA freelist_count'
      ) as { freelist_count: number } | null;

      const pageSize = pageSizeRow?.page_size ?? 0;
      const pageCount = pageCountRow?.page_count ?? 0;
      const freePages = freeListRow?.freelist_count ?? 0;
      const totalBytes = pageSize * pageCount;
      const usedBytes = pageSize * Math.max(0, pageCount - freePages);

      console.log('💾 [Cache] SQLite cache stats:');
      console.log(`   → Total events: ${eventCount?.count ?? 0}`);
      console.log(`   → Incidents (kind:30911): ${incidentCount?.count ?? 0}`);
      console.log(
        `   → Total DB size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
      );
      console.log(
        `   → Used DB size: ${(usedBytes / (1024 * 1024)).toFixed(2)} MB`
      );
    } catch (e) {
      console.warn('💾 [Cache] Could not read cache stats:', e);
    }
  }, 100);
}

// Initialize NDK with SQLite cache (no default relays - loaded from storage)
export const ndk = new NDK({
  explicitRelayUrls: [],
  cacheAdapter,

  // Keep disabled by policy outside production to prevent unexpected relay expansion.
  enableOutboxModel: NON_PRODUCTION_RELAY_POLICY.enableOutboxModel,

  // Keep disabled by policy outside production; only explicit relays are allowed.
  autoConnectUserRelays: NON_PRODUCTION_RELAY_POLICY.autoConnectUserRelays,

  // Enable AI guardrails in dev to catch common Nostr/NDK mistakes early.
  aiGuardrails: __DEV__,

  // DEV-only network tracing to verify NIP-42 AUTH handshakes are actually sent.
  netDebug: __DEV__
    ? (message, relay, direction) => {
        if (
          direction === 'send' &&
          typeof message === 'string' &&
          message.startsWith('["AUTH"')
        ) {
          console.log('🔐 [NDK net] SEND AUTH ->', relay?.url);
        }
      }
    : undefined,
});

/**
 * NIP-42 relay auth (["AUTH", <challenge>])
 *
 * Returning `true` tells NDK to authenticate. If `ndk.signer` isn't ready yet,
 * NDK will wait for `signer:ready` and then complete the auth handshake.
 */
ndk.relayAuthDefaultPolicy = async (relay, _challenge) => {
  // Some signers (NIP-46/NIP-55) can exist but not be ready to sign yet.
  // If we try to sign immediately, NDK can appear "stuck" in AUTHENTICATING.
  const signer: any = ndk.signer;
  if (signer?.blockUntilReady) {
    await signer.blockUntilReady();
  }

  if (__DEV__) {
    if (ndk.signer) {
      console.log('🔐 [NDK] Relay requested AUTH; signer ready:', relay?.url);
    } else {
      console.log(
        '🔐 [NDK] Relay requested AUTH; signer not ready yet (will auth on signer:ready):',
        relay?.url
      );
    }
  }

  return true;
};

// When a signer becomes available (session restore/login), reconnect once so relays that
// dropped during unauthenticated startup get a fresh AUTH challenge.
let reconnectOnSignerReadyScheduled = false;
// Note: some Jest tests mock `ndk` as a plain object without EventEmitter methods.
// Guard against that so importing this module doesn't crash tests.
(ndk as any).on?.('signer:ready', () => {
  if (reconnectOnSignerReadyScheduled) return;
  reconnectOnSignerReadyScheduled = true;
  setTimeout(() => {
    reconnectOnSignerReadyScheduled = false;
    ndk
      .connect()
      .catch((err) =>
        console.warn('⚠️ [NDK] Relay reconnect after signer ready warning:', err)
      );
  }, 50);
});

// Set bidirectional reference for cache adapter
cacheAdapter.ndk = ndk;

// NOTE: NDK mobile cache adapter bug patched locally:
// event_tags.event_id now uses the same referenceId as events.id for replaceable events.
// This restores tag-based cache queries for kind 30911.

// Debug: Log cache query results (simplified)
if (__DEV__) {
  const originalQuery = cacheAdapter.query.bind(cacheAdapter);
  cacheAdapter.query = (subscription: any) => {
    const results = originalQuery(subscription);
    if (results.length > 0) {
      console.log(`💾 [Cache] Returned ${results.length} cached events`);
    }
    return results;
  };
}

// NOTE: AI Guardrails are enabled in dev via the NDK constructor.

// Add global relay event logging with detailed WebSocket info
ndk.pool.on('relay:connect', (relay) => {
  // console.log('✅ [NDK] Relay CONNECTED:', relay.url, {
  //   status: relay.status,
  //   connectivity: relay.connectivity,
  // });
});

ndk.pool.on('relay:disconnect', (relay) => {
  // console.warn('⚠️ [NDK] Relay DISCONNECTED:', relay.url, {
  //   status: relay.status,
  //   connectivity: relay.connectivity,
  // });
});

ndk.pool.on('relay:connecting', (relay) => {
  // console.log('🔄 [NDK] Relay CONNECTING:', relay.url, {
  //   attempt: 'WebSocket handshake in progress',
  //   status: relay.status,
  // });
});

ndk.pool.on('relay:auth', (relay, challenge) => {
  // console.log('🔐 [NDK] Relay AUTH requested:', relay.url, {
  //   challenge: challenge?.slice(0, 50) + '...',
  //   needsAuthentication: true,
  // });
});

ndk.pool.on('relay:authed', (relay) => {
  // console.log('✅ [NDK] Relay AUTHENTICATED:', relay.url);
});

// Notice events (not relay:notice - that event doesn't exist)
ndk.pool.on('notice', (relay, notice) => {
  // console.log('📢 [NDK] Relay NOTICE:', relay.url, notice);
});

// Flapping detection (relay connecting/disconnecting rapidly)
ndk.pool.on('flapping', (relay) => {
  // console.warn('⚠️ [NDK] Relay FLAPPING (unstable connection):', relay.url);
});
