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

      console.log('💾 [Cache] SQLite cache stats:');
      console.log(`   → Total events: ${eventCount?.count ?? 0}`);
      console.log(`   → Incidents (kind:30911): ${incidentCount?.count ?? 0}`);
    } catch (e) {
      console.warn('💾 [Cache] Could not read cache stats:', e);
    }
  }, 100);
}

// Initialize NDK with SQLite cache (no default relays - loaded from storage)
export const ndk = new NDK({
  explicitRelayUrls: [],
  cacheAdapter,

  // DISABLE outbox model - prevents auto-connecting to purplepag.es, nos.lol
  enableOutboxModel: false,

  // DISABLE auto-connect to user's relay list - prevents connecting to
  // relays stored in user's kind:10002 event (relay.damus.io, relay.primal.net, etc.)
  autoConnectUserRelays: false,

  // NOTE: aiGuardrails was removed - not available in stable NDK 0.8.x
});

// Set bidirectional reference for cache adapter
cacheAdapter.ndk = ndk;

// NOTE: NDK mobile cache adapter has a bug where events.id uses tagAddress format
// but event_tags.event_id uses actual event.id for replaceable events (kind 30911).
// This breaks tag-based cache queries. See useIncidentSubscription.ts for workaround
// using cacheUnconstrainFilter to query cache by kinds only.
// TODO: Report upstream: https://github.com/nostr-dev-kit/ndk/issues/XXX

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

// NOTE: AI Guardrails removed - not available in stable NDK 0.8.x

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
