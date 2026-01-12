/**
 * Relay Status Utilities
 *
 * Provides helper functions for working with relay status values.
 *
 * @module lib/relay/status
 */

import { NDKRelayStatus, type NDKRelay } from '@nostr-dev-kit/ndk-mobile';
import type { RelayStatusString, RelayInfo } from '../../types/relay';

/**
 * Convert NDK numeric status to human-readable string.
 *
 * NDKRelayStatus enum values:
 * - 0: DISCONNECTING
 * - 1: DISCONNECTED
 * - 2: RECONNECTING
 * - 3: FLAPPING
 * - 4: CONNECTING
 * - 5: CONNECTED
 * - 6: AUTH_REQUESTED
 * - 7: AUTHENTICATING
 * - 8: AUTHENTICATED
 *
 * @param status - NDKRelayStatus numeric value
 * @returns Human-readable status string
 */
export function getStatusString(status: number): RelayStatusString {
  // Connected states (>= 5)
  if (status === NDKRelayStatus.AUTHENTICATED) return 'authenticated';
  if (status === NDKRelayStatus.AUTHENTICATING) return 'authenticating';
  if (status === NDKRelayStatus.AUTH_REQUESTED) return 'authenticating';
  if (status === NDKRelayStatus.CONNECTED) return 'connected';

  // Connecting states
  if (status === NDKRelayStatus.CONNECTING) return 'connecting';
  if (status === NDKRelayStatus.RECONNECTING) return 'reconnecting';

  // Error/unstable state
  if (status === NDKRelayStatus.FLAPPING) return 'error';

  // Disconnected states
  return 'disconnected';
}

/**
 * Check if a relay status indicates "connected" (usable).
 *
 * CRITICAL: status >= 5 means connected
 * - 5 = CONNECTED
 * - 6 = AUTH_REQUESTED (still connected)
 * - 7 = AUTHENTICATING (still connected)
 * - 8 = AUTHENTICATED (still connected)
 *
 * @param status - NDKRelayStatus numeric value
 * @returns true if relay is usable
 */
export function isConnected(status: number): boolean {
  return status >= NDKRelayStatus.CONNECTED;
}

/**
 * Check if a relay status indicates "connecting" (in progress).
 *
 * @param status - NDKRelayStatus numeric value
 * @returns true if relay is attempting connection
 */
export function isConnecting(status: number): boolean {
  return (
    status === NDKRelayStatus.CONNECTING ||
    status === NDKRelayStatus.RECONNECTING
  );
}

/**
 * Get status color for UI display.
 *
 * @param status - RelayStatusString
 * @returns Hex color code
 */
export function getStatusColor(status: RelayStatusString): string {
  switch (status) {
    case 'connected':
    case 'authenticated':
      return '#10b981'; // Green
    case 'connecting':
    case 'reconnecting':
    case 'authenticating':
      return '#f59e0b'; // Amber
    case 'error':
      return '#ef4444'; // Red
    case 'disconnected':
    default:
      return '#6b7280'; // Gray
  }
}

/**
 * Convert NDKRelay to enriched RelayInfo for UI.
 *
 * @param relay - NDKRelay instance
 * @returns RelayInfo object with all display data
 */
export function relayToInfo(relay: NDKRelay): RelayInfo {
  const rawStatus = relay.status;
  const statusString = getStatusString(rawStatus);

  return {
    url: relay.url,
    status: statusString,
    rawStatus,
    isConnected: isConnected(rawStatus),
    // NIP-11 info (may be undefined if not fetched)
    name: relay.info?.name,
    description: relay.info?.description,
    supportedNips: relay.info?.supported_nips,
  };
}

/**
 * Sort relays with connected first, then by URL.
 *
 * @param relays - Array of RelayInfo
 * @returns Sorted array
 */
export function sortRelays(relays: RelayInfo[]): RelayInfo[] {
  return [...relays].sort((a, b) => {
    // Connected relays first
    if (a.isConnected && !b.isConnected) return -1;
    if (!a.isConnected && b.isConnected) return 1;
    // Then alphabetically by URL
    return a.url.localeCompare(b.url);
  });
}
