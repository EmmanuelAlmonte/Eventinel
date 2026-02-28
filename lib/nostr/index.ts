/**
 * @eventinel/nostr
 *
 * Nostr integration library for Eventinel - a public safety monitoring platform.
 * Provides NDK client, custom event types (kind:30911), and React hooks.
 *
 * @example
 * ```typescript
 * import { getSharedNDK, createIncidentEvent, parseIncidentEvent } from '@eventinel/nostr';
 *
 * const ndk = await getSharedNDK();
 * await ndk.connect();
 * ```
 *
 * @packageDocumentation
 */

// Configuration
export {
  DEFAULT_RELAYS,
  getRelayUrls,
  NOSTR_KINDS,
  TAGS,
  EVENTINEL_TAGS,
  INCIDENT_TYPES,
  DATA_SOURCES,
  GEOHASH_PRECISION,
  DEFAULT_GEOHASH_PRECISION,
  SUBSCRIPTION_DEFAULTS,
  NIP05_DOMAIN,
  NIP05_NAMES,
} from './config';

export type {
  NostrKind,
  IncidentType,
  Severity,
  DataSource,
} from './config';

// Client
export {
  createNDK,
  getSharedNDK,
  getSharedNDKSync,
  setSharedNDK,
  resetSharedNDK,
  getConnectionState,
} from './client';

export type {
  CreateNDKOptions,
  ConnectionState,
} from './client';

// Events
export {
  createIncidentEvent,
  parseIncidentEvent,
  validateIncidentEvent,
  getTagValue,
  getTagValues,
  parseGeolocation,
} from './events';

export type {
  RawNostrEvent,
  UnsignedEvent,
  IncidentEventTags,
  IncidentEventContent,
  IncidentEvent,
  IncidentLocation,
  ParsedIncident,
  CreateIncidentInput,
  IncidentSubscriptionFilter,
  IncidentCallback,
  EoseCallback,
  VerificationResult,
} from './events';

export {
  isIncidentType,
  isSeverity,
  isDataSource,
  isIncidentEventContent,
} from './events';

// Re-export NDK types for convenience
export type { NDKEvent, NDKFilter, NDKSubscription } from '@nostr-dev-kit/mobile';
