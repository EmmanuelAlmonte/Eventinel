/**
 * Eventinel Nostr Event Type Definitions
 *
 * TypeScript types for Nostr events used in Eventinel,
 * specifically the custom kind:30911 incident events.
 */

import type { NDKEvent } from '@nostr-dev-kit/mobile';
import type { IncidentType, Severity, DataSource } from '../config';

// =============================================================================
// RAW NOSTR EVENT TYPES
// =============================================================================

/**
 * Raw Nostr event structure (before NDK processing)
 */
export interface RawNostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/**
 * Unsigned event for signing
 */
export interface UnsignedEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at?: number;
}

// =============================================================================
// INCIDENT EVENT TYPES (kind:30911)
// =============================================================================

/**
 * Tag structure for kind:30911 incident events
 *
 * Required tags:
 * - ['d', '<incident-id>'] - Unique identifier
 * - ['g', '<geohash>'] - Geohash for filtering (NIP-52 standard)
 * - ['location', '<place>'] - Human-readable location (NIP-52 compatible)
 * - ['type', '<type>'] - Incident classification
 * - ['severity', '<1-5>'] - Severity level
 * - ['source', '<source>'] - Data source
 * - ['t', 'eventinel'] - App identifier
 * - ['t', 'incident'] - Category
 */
export type IncidentEventTags = [
  ['d', string], // Unique incident ID
  ['g', string], // Geohash (NIP-52 standard, filterable)
  ['location', string], // Human-readable location
  ['type', IncidentType],
  ['severity', string], // "1" - "5"
  ['source', DataSource],
  ['address', string],
  ['t', 'eventinel'],
  ['t', 'incident'],
  ['t', string], // Type-specific tag
  ...string[][], // Additional optional tags
];

/**
 * JSON content structure for incident events
 */
export interface IncidentEventContent {
  /** Short title/headline */
  title: string;

  /** Detailed description */
  description: string;

  /** Latitude coordinate */
  lat: number;

  /** Longitude coordinate */
  lng: number;

  /** Incident type classification */
  type: IncidentType;

  /** Severity level (1-5) */
  severity: Severity;

  /** When the incident occurred (ISO 8601) */
  occurredAt: string;

  /** Data source identifier */
  source: DataSource;

  /** Original ID from source system */
  sourceId: string;

  /** City name */
  city?: string;

  /** State abbreviation */
  state?: string;

  /** Additional metadata from source */
  metadata?: Record<string, unknown>;
}

/**
 * Full incident event structure
 */
export interface IncidentEvent extends RawNostrEvent {
  kind: 30911;
  tags: IncidentEventTags;
  content: string; // JSON stringified IncidentEventContent
}

// =============================================================================
// PARSED INCIDENT TYPES
// =============================================================================

/**
 * Location data for an incident
 */
export interface IncidentLocation {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  state?: string;
  geohash: string;
}

/**
 * Fully parsed incident from Nostr event
 * This is the primary type used throughout the application
 */
export interface ParsedIncident {
  /** Nostr event ID (hex) */
  eventId: string;

  /** Unique incident identifier (from 'd' tag) */
  incidentId: string;

  /** Publisher's public key (hex) */
  pubkey: string;

  /** Event creation timestamp (Unix seconds) */
  createdAt: number;

  /** Incident type classification */
  type: IncidentType;

  /** Severity level (1-5) */
  severity: Severity;

  /** Short title/headline */
  title: string;

  /** Detailed description */
  description: string;

  /** Location information */
  location: IncidentLocation;

  /** When the incident occurred */
  occurredAt: Date;

  /** Data source identifier */
  source: DataSource;

  /** Original ID from source system */
  sourceId: string;

  /** Whether from verified Eventinel pubkey */
  isVerified: boolean;

  /** Raw NDK event for advanced usage */
  rawEvent?: NDKEvent;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// INPUT TYPES FOR CREATING INCIDENTS
// =============================================================================

/**
 * Input for creating a new incident event
 */
export interface CreateIncidentInput {
  /** Unique incident identifier (generated if not provided) */
  incidentId?: string;

  /** Incident type */
  type: IncidentType;

  /** Severity level (1-5) */
  severity: Severity;

  /** Short title/headline */
  title: string;

  /** Detailed description */
  description: string;

  /** Location information */
  location: {
    lat: number;
    lng: number;
    address: string;
    city?: string;
    state?: string;
  };

  /** When the incident occurred */
  occurredAt: Date;

  /** Data source */
  source: DataSource;

  /** Original ID from source system */
  sourceId: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// SUBSCRIPTION/FILTER TYPES
// =============================================================================

/**
 * Filter options for incident subscriptions
 */
export interface IncidentSubscriptionFilter {
  /** Filter by incident types */
  types?: IncidentType[];

  /** Minimum severity level */
  minSeverity?: Severity;

  /** Filter by data sources */
  sources?: DataSource[];

  /** Geohash prefixes for location filtering */
  geohashes?: string[];

  /** Only events after this timestamp (Unix seconds) */
  since?: number;

  /** Only events before this timestamp (Unix seconds) */
  until?: number;

  /** Maximum number of events */
  limit?: number;

  /** Only from verified Eventinel pubkeys */
  verifiedOnly?: boolean;
}

/**
 * Subscription callback for new incidents
 */
export type IncidentCallback = (incident: ParsedIncident) => void;

/**
 * EOSE (End of Stored Events) callback
 */
export type EoseCallback = () => void;

// =============================================================================
// VERIFICATION TYPES
// =============================================================================

/**
 * Result of incident event verification
 */
export interface VerificationResult {
  /** Overall validity */
  isValid: boolean;

  /** From known Eventinel pubkey */
  isVerified: boolean;

  /** List of validation errors if invalid */
  errors: string[];

  /** Warnings (valid but concerning) */
  warnings: string[];
}

// =============================================================================
// HELPER TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if a value is a valid IncidentType
 */
export function isIncidentType(value: unknown): value is IncidentType {
  const validTypes = [
    'violent_crime',
    'property_crime',
    'fire',
    'medical',
    'traffic',
    'transit',
    'weather',
    'public_health',
    'disturbance',
    'suspicious',
    'other',
  ];
  return typeof value === 'string' && validTypes.includes(value);
}

/**
 * Type guard to check if a value is a valid Severity
 */
export function isSeverity(value: unknown): value is Severity {
  return typeof value === 'number' && value >= 1 && value <= 5;
}

/**
 * Type guard to check if a value is a valid DataSource
 */
export function isDataSource(value: unknown): value is DataSource {
  const validSources = [
    'crimeometer',
    'opendataphilly',
    'radio',
    'community',
    'nj_transit_rss',
    'nj_511_rss',
  ];
  return typeof value === 'string' && validSources.includes(value);
}

/**
 * Type guard for parsed incident content
 */
export function isIncidentEventContent(
  value: unknown
): value is IncidentEventContent {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.title === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.lat === 'number' &&
    typeof obj.lng === 'number' &&
    isIncidentType(obj.type) &&
    isSeverity(obj.severity) &&
    typeof obj.occurredAt === 'string' &&
    isDataSource(obj.source) &&
    typeof obj.sourceId === 'string'
  );
}
