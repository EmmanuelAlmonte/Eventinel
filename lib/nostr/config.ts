/**
 * Eventinel Nostr Configuration
 *
 * Central configuration for all Nostr-related constants including
 * relay URLs, event kinds, and geohash settings.
 */

// =============================================================================
// RELAY CONFIGURATION
// =============================================================================

/**
 * Default relay URLs for Eventinel
 *
 * IMPORTANT: No public relays are included by default to prevent
 * accidental publishing of test data to public networks.
 *
 * Development: wss://localhost:8443 (local Netstr relay)
 * Production:  wss://relay.eventinel.com (own relay)
 */
export const DEFAULT_RELAYS = {
  /** Local development relay - Netstr */
  DEVELOPMENT: 'wss://localhost:8443',

  /** Production relay (future) */
  PRODUCTION: 'wss://relay.eventinel.com',
} as const;

/**
 * Get relay URLs from environment
 *
 * SECURITY: Never falls back to public relays.
 * If no relay is configured, uses local development relay only.
 */
export function getRelayUrls(): string[] {
  const envRelays = process.env.NEXT_PUBLIC_NOSTR_RELAYS;

  // If explicitly configured, use those relays
  if (envRelays) {
    return envRelays.split(',').map((r: string) => r.trim());
  }

  // Default to local development relay only
  // This prevents accidental publishing to public relays
  console.warn(
    '[Eventinel] No NEXT_PUBLIC_NOSTR_RELAYS configured. Using local development relay: wss://localhost:8443'
  );
  return [DEFAULT_RELAYS.DEVELOPMENT];
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
      relay.includes('relay.eventinel.com')
  );
}

// =============================================================================
// EVENT KIND CONSTANTS
// =============================================================================

/**
 * Custom Nostr event kinds for Eventinel
 *
 * kind:30911 - Parameterized Replaceable Event for incidents
 * - Uses 'd' tag for unique incident ID
 * - Allows updates to same incident
 * - Geohash tagged for location filtering
 */
export const NOSTR_KINDS = {
  /** Public safety incident (parameterized replaceable) */
  INCIDENT: 30911,

  /** Standard text note for alerts/announcements */
  ALERT: 1,

  /** User metadata/profile */
  METADATA: 0,
} as const;

export type NostrKind = (typeof NOSTR_KINDS)[keyof typeof NOSTR_KINDS];

// =============================================================================
// TAG CONSTANTS
// =============================================================================

/**
 * Standard tag names used in Eventinel events
 *
 * Note: 'g' tag follows NIP-52 standard for geohash (single-letter, filterable by relays)
 */
export const TAGS = {
  /** Unique identifier for parameterized replaceable events */
  IDENTIFIER: 'd',

  /** Precise geolocation as "lat,lng" */
  GEOLOCATION: 'l',

  /** Geohash for location-based filtering (NIP-52 standard) */
  GEOHASH: 'g',

  /** Incident type classification */
  TYPE: 'type',

  /** Severity level (1-5) */
  SEVERITY: 'severity',

  /** Data source identifier */
  SOURCE: 'source',

  /** Human-readable address */
  ADDRESS: 'address',

  /** Generic hashtag */
  HASHTAG: 't',
} as const;

/**
 * Standard hashtags for Eventinel events
 */
export const EVENTINEL_TAGS = {
  /** App identifier - all Eventinel events */
  APP: 'eventinel',

  /** Category tag for incidents */
  INCIDENT: 'incident',

  /** Category tag for alerts */
  ALERT: 'alert',
} as const;

// =============================================================================
// INCIDENT TYPES
// =============================================================================

/**
 * Supported incident type classifications
 */
export const INCIDENT_TYPES = {
  VIOLENT_CRIME: 'violent_crime',
  PROPERTY_CRIME: 'property_crime',
  FIRE: 'fire',
  MEDICAL: 'medical',
  TRAFFIC: 'traffic',
  DISTURBANCE: 'disturbance',
  SUSPICIOUS: 'suspicious',
  OTHER: 'other',
} as const;

export type IncidentType = (typeof INCIDENT_TYPES)[keyof typeof INCIDENT_TYPES];

/**
 * Severity levels (1-5)
 * 5 = Critical (active shooter, structure fire)
 * 4 = High (robbery in progress, serious accident)
 * 3 = Medium (burglary, assault)
 * 2 = Low (theft, vandalism)
 * 1 = Info (noise complaint, suspicious activity)
 */
export type Severity = 1 | 2 | 3 | 4 | 5;

/**
 * Data source identifiers
 */
export const DATA_SOURCES = {
  CRIMEOMETER: 'crimeometer',
  OPENDATAPHILLY: 'opendataphilly',
  RADIO: 'radio',
  COMMUNITY: 'community',
} as const;

export type DataSource = (typeof DATA_SOURCES)[keyof typeof DATA_SOURCES];

// =============================================================================
// GEOHASH CONFIGURATION
// =============================================================================

/**
 * Geohash precision levels
 *
 * | Precision | Cell Size | Use Case |
 * |-----------|-----------|----------|
 * | 4 chars   | ~40km     | Regional filtering |
 * | 5 chars   | ~5km      | City-level (default) |
 * | 6 chars   | ~1km      | Neighborhood |
 * | 7 chars   | ~150m     | Block-level |
 */
export const GEOHASH_PRECISION = {
  REGIONAL: 4,
  CITY: 5, // Default for Eventinel (~5km cells)
  NEIGHBORHOOD: 6,
  BLOCK: 7,
} as const;

/** Default geohash precision for incident events */
export const DEFAULT_GEOHASH_PRECISION = GEOHASH_PRECISION.CITY;

// =============================================================================
// SUBSCRIPTION DEFAULTS
// =============================================================================

/**
 * Default subscription parameters
 */
export const SUBSCRIPTION_DEFAULTS = {
  /** Default time range for historical events (short-terms in seconds) */
  SINCE_HOURS: 24,

  /** Maximum events to fetch in initial load */
  LIMIT: 100,

  /** Subscription timeout in milliseconds */
  TIMEOUT_MS: 10000,
} as const;

// =============================================================================
// NIP-05 CONFIGURATION
// =============================================================================

/**
 * NIP-05 verification domain
 */
export const NIP05_DOMAIN = 'eventinel.com';

/**
 * Well-known NIP-05 identifiers
 */
export const NIP05_NAMES = {
  /** Root identity: _@eventinel.com */
  ROOT: '_',

  /** Official account: official@eventinel.com */
  OFFICIAL: 'official',

  /** Alerts account: alerts@eventinel.com */
  ALERTS: 'alerts',
} as const;
