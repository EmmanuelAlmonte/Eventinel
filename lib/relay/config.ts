/**
 * Relay Configuration
 *
 * Single source of truth for relay defaults and env-driven overrides.
 */

const DEFAULT_PRODUCTION_RELAYS = ['wss://relay.eventinel.com'];
const DEFAULT_LOCAL_RELAYS = ['ws://10.0.2.2:8085'];

/**
 * Normalize relay URL for consistent comparison.
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes trailing slash
 */
export function normalizeRelayUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/$/, '');
}

export function parseRelayList(raw?: string | null): string[] {
  if (!raw) return [];

  const relays = raw
    .split(',')
    .map((relay) => relay.trim())
    .filter((relay) => relay.length > 0)
    .map(normalizeRelayUrl);

  return [...new Set(relays)];
}

function resolveRelayList(raw: string | null | undefined, fallback: string[]): string[] {
  const parsed = parseRelayList(raw);
  if (parsed.length > 0) {
    return parsed;
  }

  return fallback.map(normalizeRelayUrl);
}

/**
 * Default relays to use if no saved relays exist.
 * In release builds, this is pinned to production relays.
 * In development, EXPO_PUBLIC_NOSTR_RELAYS (comma-separated) can override.
 */
export const DEFAULT_RELAYS = (() => {
  if (!__DEV__) {
    return DEFAULT_PRODUCTION_RELAYS.map(normalizeRelayUrl);
  }

  const envRelays =
    process.env.EXPO_PUBLIC_NOSTR_RELAYS ??
    process.env.NEXT_PUBLIC_NOSTR_RELAYS;

  return resolveRelayList(envRelays, DEFAULT_PRODUCTION_RELAYS);
})();

/**
 * Local relay(s) used for dev toggle.
 * Override via EXPO_PUBLIC_LOCAL_RELAYS (comma-separated) if needed.
 */
export const LOCAL_RELAYS = (() => {
  const envRelays =
    process.env.EXPO_PUBLIC_LOCAL_RELAYS ??
    process.env.EXPO_PUBLIC_LOCAL_RELAY;

  return resolveRelayList(envRelays, DEFAULT_LOCAL_RELAYS);
})();

/**
 * Relay URLs used by default when creating an NDK client.
 */
export function getRelayUrls(): string[] {
  return DEFAULT_RELAYS;
}

/**
 * Check if we're using only local/private relays
 * Useful for safety checks before publishing
 */
export function isUsingLocalRelaysOnly(): boolean {
  const relays = getRelayUrls();
  return relays.every(
    (relay) =>
      relay.includes('localhost') ||
      relay.includes('127.0.0.1') ||
      relay.includes('10.0.2.2') ||
      relay.includes('relay.eventinel.com')
  );
}
