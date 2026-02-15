/**
 * Eventinel Nostr Configuration
 *
 * Central configuration for all Nostr-related constants including
 * relay URLs, event kinds, and geohash settings.
 */

// =============================================================================
// RELAY CONFIGURATION
// =============================================================================

// Relay defaults and env parsing live in lib/relay/config.ts
export {
  DEFAULT_RELAYS,
  LOCAL_RELAYS,
  getRelayUrls,
  isUsingLocalRelaysOnly,
  normalizeRelayUrl,
  parseRelayList,
} from '../relay/config';

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

  /** Event deletion (NIP-09) */
  EVENT_DELETION: 5,

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
 * Notes:
 * - 'g' follows NIP-52 geohash usage.
 * - 'location' is a human-readable location string.
 * - 'l' is reserved for NIP-32 labels (not coordinates).
 */
export const TAGS = {
  /** Unique identifier for parameterized replaceable events */
  IDENTIFIER: 'd',

  /** Human-readable location string (NIP-52) */
  LOCATION: 'location',

  /** Geohash for location-based filtering (NIP-52 standard) */
  GEOHASH: 'g',

  /** Label value (NIP-32), not used for incident coordinates */
  LABEL: 'l',

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
export const DEFAULT_GEOHASH_PRECISION = GEOHASH_PRECISION.NEIGHBORHOOD;

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

// =============================================================================
// UI CONFIGURATION (SEVERITY & TYPE DISPLAY)
// =============================================================================

/**
 * Severity colors for UI display
 * Used by SeverityBadge, markers, and cards
 */
export const SEVERITY_COLORS: Record<Severity, string> = {
  5: '#DC2626', // Critical - red
  4: '#EA580C', // High - orange-red
  3: '#F59E0B', // Medium - amber
  2: '#3B82F6', // Low - blue
  1: '#6B7280', // Info - gray
};

/**
 * Incident type configuration for UI display
 * Includes icon, colors, and display label
 */
export const TYPE_CONFIG: Record<
  IncidentType,
  {
    icon: string;
    glyph: string;
    color: string;
    gradient: [string, string];
    label: string;
  }
> = {
  fire: {
    icon: 'local-fire-department',
    glyph: '🔥',
    color: '#EF4444',
    gradient: ['#EF4444', '#F97316'],
    label: 'Fire',
  },
  medical: {
    icon: 'medical-services',
    glyph: '🏥',
    color: '#3B82F6',
    gradient: ['#3B82F6', '#06B6D4'],
    label: 'Medical',
  },
  traffic: {
    icon: 'traffic',
    glyph: '🚗',
    color: '#F97316',
    gradient: ['#F97316', '#EAB308'],
    label: 'Traffic',
  },
  violent_crime: {
    icon: 'warning',
    glyph: '⚠️',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#EC4899'],
    label: 'Crime',
  },
  property_crime: {
    icon: 'home',
    glyph: '🏠',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#6366F1'],
    label: 'Property Crime',
  },
  disturbance: {
    icon: 'volume-up',
    glyph: '📢',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#EAB308'],
    label: 'Disturbance',
  },
  suspicious: {
    icon: 'visibility',
    glyph: '👁',
    color: '#6B7280',
    gradient: ['#6B7280', '#9CA3AF'],
    label: 'Suspicious',
  },
  other: {
    icon: 'info',
    glyph: 'ℹ️',
    color: '#6B7280',
    gradient: ['#6B7280', '#9CA3AF'],
    label: 'Other',
  },
};
