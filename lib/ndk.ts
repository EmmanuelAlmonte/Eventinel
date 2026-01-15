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

// Determine if we're in development mode
const isDevelopment = __DEV__; // React Native's built-in dev flag

// Initialize NDK with SQLite cache (no default relays - loaded from storage)
export const ndk = new NDK({
  explicitRelayUrls: [],
  cacheAdapter,

  // DISABLE outbox model - prevents auto-connecting to purplepag.es, nos.lol
  enableOutboxModel: false,

  // DISABLE auto-connect to user's relay list - prevents connecting to
  // relays stored in user's kind:10002 event (relay.damus.io, relay.primal.net, etc.)
  autoConnectUserRelays: false,

  // Enable AI Guardrails in development to catch common mistakes
  // Automatically disabled in production builds for zero performance impact
  aiGuardrails: isDevelopment,
});

// Set bidirectional reference for cache adapter
cacheAdapter.ndk = ndk;

// Log AI Guardrails status
if (isDevelopment) {
  console.log('🛡️ [NDK] AI Guardrails: ENABLED');
  console.log('   → Catching common mistakes during development');
  console.log('   → Automatically disabled in production builds');
} else {
  console.log('🛡️ [NDK] AI Guardrails: DISABLED (production build)');
}

// Add global relay event logging with detailed WebSocket info
ndk.pool.on('relay:connect', (relay) => {
  console.log('✅ [NDK] Relay CONNECTED:', relay.url, {
    status: relay.status,
    connectivity: relay.connectivity,
  });
});

ndk.pool.on('relay:disconnect', (relay) => {
  console.warn('⚠️ [NDK] Relay DISCONNECTED:', relay.url, {
    status: relay.status,
    connectivity: relay.connectivity,
  });
});

ndk.pool.on('relay:connecting', (relay) => {
  console.log('🔄 [NDK] Relay CONNECTING:', relay.url, {
    attempt: 'WebSocket handshake in progress',
    status: relay.status,
  });
});

ndk.pool.on('relay:auth', (relay, challenge) => {
  console.log('🔐 [NDK] Relay AUTH requested:', relay.url, {
    challenge: challenge?.slice(0, 50) + '...',
    needsAuthentication: true,
  });
});

ndk.pool.on('relay:authed', (relay) => {
  console.log('✅ [NDK] Relay AUTHENTICATED:', relay.url);
});

// Notice events (not relay:notice - that event doesn't exist)
ndk.pool.on('notice', (relay, notice) => {
  console.log('📢 [NDK] Relay NOTICE:', relay.url, notice);
});

// Flapping detection (relay connecting/disconnecting rapidly)
ndk.pool.on('flapping', (relay) => {
  console.warn('⚠️ [NDK] Relay FLAPPING (unstable connection):', relay.url);
});
