/**
 * NDK Singleton Instance
 *
 * IMPORTANT: This file initializes NDK ONCE at module level to ensure
 * a singleton pattern. Import { ndk } from here in your screens.
 *
 * @module lib/ndk
 */

import NDK from '@nostr-dev-kit/ndk-mobile';
import { NDKCacheAdapterSqlite } from '@nostr-dev-kit/ndk-mobile';

// Initialize SQLite cache adapter
const cacheAdapter = new NDKCacheAdapterSqlite('eventinel.db');
cacheAdapter.initialize(); // Create database tables

// Initialize NDK with SQLite cache (no default relays - loaded from storage)
export const ndk = new NDK({
  explicitRelayUrls: [],
  cacheAdapter,
});

// Set bidirectional reference for cache adapter
cacheAdapter.ndk = ndk;

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

ndk.pool.on('relay:error', (relay, error) => {
  // Extract detailed error info
  const errorDetails = {
    message: error?.message || 'Unknown error',
    name: error?.name,
    code: (error as any)?.code,
    type: (error as any)?.type,
    stack: error?.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines
  };

  console.error('❌ [NDK] Relay ERROR:', relay.url, errorDetails);

  // Log specific error types
  if ((error as any)?.code === 'ECONNREFUSED') {
    console.error('   → Connection refused (relay not running or port blocked)');
  } else if ((error as any)?.code === 'ETIMEDOUT') {
    console.error('   → Connection timeout (relay unreachable)');
  } else if ((error as any)?.code === 'ENOTFOUND') {
    console.error('   → DNS resolution failed (invalid hostname)');
  } else if ((error as any)?.type === 'close') {
    console.error('   → WebSocket closed unexpectedly');
  }
});

ndk.pool.on('relay:auth', (relay, challenge) => {
  console.log('🔐 [NDK] Relay AUTH requested:', relay.url, {
    challenge: challenge?.slice(0, 50) + '...',
    needsAuthentication: true,
  });
});

// Additional low-level relay events
ndk.pool.on('relay:notice', (relay, notice) => {
  console.log('📢 [NDK] Relay NOTICE:', relay.url, notice);
});

ndk.pool.on('relay:eose', (relay, subscription) => {
  console.log('🏁 [NDK] End of stored events (EOSE):', relay.url, 'subscription:', subscription);
});
