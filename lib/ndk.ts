/**
 * NDK Instance Module
 *
 * This file creates the NDK singleton OUTSIDE of any component hierarchy
 * to avoid circular dependencies. Both App.tsx and screen components
 * import from here.
 *
 * @module lib/ndk
 */

import NDK from '@nostr-dev-kit/ndk-mobile';
import { NDKCacheAdapterSqlite } from '@nostr-dev-kit/ndk-mobile';

// =============================================================================
// NDK INITIALIZATION (Module-level singleton)
// =============================================================================

/**
 * Initialize SQLite cache adapter.
 * MUST call initialize() before passing to NDK.
 */
const cacheAdapter = new NDKCacheAdapterSqlite('eventinel.db');
cacheAdapter.initialize();

/**
 * NDK singleton instance.
 *
 * Created at module level to ensure:
 * 1. Single instance across the entire app
 * 2. No circular dependencies (this file imports nothing from App or screens)
 * 3. Relay connections persist across navigation
 */
export const ndk = new NDK({
  explicitRelayUrls: [],
  cacheAdapter,
});

// Bidirectional reference for cache adapter queries
cacheAdapter.ndk = ndk;

// Note: Not calling ndk.connect() here because relays are added manually via UI
// If you want default relays, add them to explicitRelayUrls above and uncomment:
// ndk.connect();

// Default export for convenience
export default ndk;
