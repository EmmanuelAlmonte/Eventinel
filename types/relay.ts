/**
 * Relay Type Definitions
 *
 * @module types/relay
 */

import type { NDKRelay } from '@nostr-dev-kit/mobile';

/**
 * Relay status as human-readable string.
 * Mapped from NDKRelayStatus enum values.
 */
export type RelayStatusString =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'authenticating'
  | 'authenticated'
  | 'error';

/**
 * Enriched relay information for UI display.
 */
export interface RelayInfo {
  /** Relay WebSocket URL */
  url: string;
  /** Human-readable status */
  status: RelayStatusString;
  /** Raw NDK status value */
  rawStatus: number;
  /** Whether relay is usable (connected or better) */
  isConnected: boolean;
  /** NIP-11 relay name (if available) */
  name?: string;
  /** NIP-11 relay description */
  description?: string;
  /** Supported NIPs from NIP-11 */
  supportedNips?: number[];
  /** Last connection error (if any) */
  error?: string;
}

/**
 * Relay pool statistics.
 */
export interface RelayPoolStats {
  total: number;
  connected: number;
  connecting: number;
  disconnected: number;
}

/**
 * Re-export NDKRelay for convenience.
 */
export type { NDKRelay };
