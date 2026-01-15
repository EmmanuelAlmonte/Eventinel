/**
 * Eventinel Incident Event (kind:30911)
 *
 * Creates, parses, and validates Nostr events for public safety incidents.
 * Uses parameterized replaceable events for updatable incident data.
 */

import NDK, { NDKEvent } from '@nostr-dev-kit/mobile';
import geohash from 'ngeohash';

import {
  NOSTR_KINDS,
  TAGS,
  EVENTINEL_TAGS,
  DEFAULT_GEOHASH_PRECISION,
} from '../config';

import type {
  CreateIncidentInput,
  ParsedIncident,
  IncidentEventContent,
  VerificationResult,
} from './types';

import {
  isIncidentType,
  isSeverity,
  isDataSource,
  isIncidentEventContent,
} from './types';

// =============================================================================
// TAG HELPERS
// =============================================================================

/**
 * Extracts a single tag value from event tags
 */
function getTagValue(tags: string[][], tagName: string): string | undefined {
  const tag = tags.find((t) => t[0] === tagName);
  return tag?.[1];
}

/**
 * Extracts all values for a specific tag type
 */
function getTagValues(tags: string[][], tagName: string): string[] {
  return tags.filter((t) => t[0] === tagName).map((t) => t[1]);
}

/**
 * Parses geolocation from 'g' tag ("lat,lng" format)
 */
function parseGeolocation(
  geoTag: string | undefined
): { lat: number; lng: number } | null {
  if (!geoTag) return null;

  const parts = geoTag.split(',');
  if (parts.length !== 2) return null;

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

// =============================================================================
// EVENT CREATION
// =============================================================================

/**
 * Builds the tags array for an incident event
 */
function buildIncidentTags(input: CreateIncidentInput): string[][] {
  const incidentId = input.incidentId || crypto.randomUUID();
  const hash = geohash.encode(
    input.location.lat,
    input.location.lng,
    DEFAULT_GEOHASH_PRECISION
  );

  const tags: string[][] = [
    // Required identifiers
    [TAGS.IDENTIFIER, incidentId],
    [TAGS.GEOLOCATION, `${input.location.lat},${input.location.lng}`],
    [TAGS.GEOHASH, hash],

    // Classification
    [TAGS.TYPE, input.type],
    [TAGS.SEVERITY, input.severity.toString()],
    [TAGS.SOURCE, input.source],

    // Location
    [TAGS.ADDRESS, input.location.address],

    // Hashtags for filtering
    [TAGS.HASHTAG, EVENTINEL_TAGS.APP],
    [TAGS.HASHTAG, EVENTINEL_TAGS.INCIDENT],
    [TAGS.HASHTAG, input.type],
  ];

  return tags;
}

/**
 * Builds the JSON content for an incident event
 */
function buildIncidentContent(input: CreateIncidentInput): IncidentEventContent {
  return {
    title: input.title,
    description: input.description,
    lat: input.location.lat,
    lng: input.location.lng,
    type: input.type,
    severity: input.severity,
    occurredAt: input.occurredAt.toISOString(),
    source: input.source,
    sourceId: input.sourceId,
    city: input.location.city,
    state: input.location.state,
    metadata: input.metadata,
  };
}

/**
 * Creates an unsigned NDKEvent for an incident
 *
 * @param ndk - NDK instance
 * @param input - Incident data
 * @returns Unsigned NDKEvent ready for signing
 *
 * @example
 * ```typescript
 * const event = createIncidentEvent(ndk, {
 *   type: 'fire',
 *   severity: 4,
 *   title: 'Structure Fire',
 *   description: 'Two-alarm fire at warehouse',
 *   location: { lat: 39.95, lng: -75.16, address: '123 Main St' },
 *   occurredAt: new Date(),
 *   source: 'crimeometer',
 *   sourceId: 'cm-12345',
 * });
 *
 * await event.sign();
 * await event.publish();
 * ```
 */
export function createIncidentEvent(
  ndk: NDK,
  input: CreateIncidentInput
): NDKEvent {
  const event = new NDKEvent(ndk);

  event.kind = NOSTR_KINDS.INCIDENT;
  event.tags = buildIncidentTags(input);
  event.content = JSON.stringify(buildIncidentContent(input));

  return event;
}

// =============================================================================
// EVENT PARSING
// =============================================================================

/**
 * Parses an NDKEvent into a structured ParsedIncident
 *
 * @param event - NDK event to parse
 * @param verifiedPubkeys - Optional set of pubkeys considered "verified"
 * @returns Parsed incident or null if invalid
 *
 * @example
 * ```typescript
 * const incident = parseIncidentEvent(event);
 * if (incident) {
 *   console.log(`${incident.title} at ${incident.location.address}`);
 * }
 * ```
 */
export function parseIncidentEvent(
  event: NDKEvent,
  verifiedPubkeys?: Set<string>
): ParsedIncident | null {
  // Validate event kind
  if (event.kind !== NOSTR_KINDS.INCIDENT) {
    return null;
  }

  // Extract required tags
  const incidentId = getTagValue(event.tags, TAGS.IDENTIFIER);
  const geoTag = getTagValue(event.tags, TAGS.GEOLOCATION);
  const geohashTag = getTagValue(event.tags, TAGS.GEOHASH);
  const typeTag = getTagValue(event.tags, TAGS.TYPE);
  const severityTag = getTagValue(event.tags, TAGS.SEVERITY);
  const sourceTag = getTagValue(event.tags, TAGS.SOURCE);
  const addressTag = getTagValue(event.tags, TAGS.ADDRESS);

  // Validate required fields
  if (!incidentId || !geoTag || !typeTag || !severityTag || !sourceTag) {
    return null;
  }

  // Parse geolocation
  const geo = parseGeolocation(geoTag);
  if (!geo) {
    return null;
  }

  // Validate type and severity
  if (!isIncidentType(typeTag)) {
    return null;
  }

  const severity = parseInt(severityTag, 10);
  if (!isSeverity(severity)) {
    return null;
  }

  if (!isDataSource(sourceTag)) {
    return null;
  }

  // Parse content JSON
  let content: IncidentEventContent;
  try {
    const parsed = JSON.parse(event.content);
    if (!isIncidentEventContent(parsed)) {
      return null;
    }
    content = parsed;
  } catch {
    return null;
  }

  // Check if from verified source
  const officialPubkey = process.env.EVENTINEL_OFFICIAL_PUBKEY_HEX;
  const isVerified =
    (officialPubkey && event.pubkey === officialPubkey) ||
    (verifiedPubkeys?.has(event.pubkey) ?? false);

  return {
    eventId: event.id,
    incidentId,
    pubkey: event.pubkey,
    createdAt: event.created_at ?? Math.floor(Date.now() / 1000),
    type: typeTag,
    severity,
    title: content.title,
    description: content.description,
    location: {
      lat: geo.lat,
      lng: geo.lng,
      address: addressTag || content.title,
      city: content.city,
      state: content.state,
      geohash: geohashTag || geohash.encode(geo.lat, geo.lng, DEFAULT_GEOHASH_PRECISION),
    },
    occurredAt: new Date(content.occurredAt),
    source: sourceTag,
    sourceId: content.sourceId,
    isVerified,
    // NOTE: rawEvent intentionally omitted to save memory (~0.5-1MB per event)
    // If needed, re-fetch by eventId from relay
    metadata: content.metadata,
  };
}

// =============================================================================
// EVENT VALIDATION
// =============================================================================

/**
 * Validates an incident event structure without parsing
 *
 * @param event - Event to validate
 * @returns Validation result with errors and warnings
 */
export function validateIncidentEvent(event: NDKEvent): VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check kind
  if (event.kind !== NOSTR_KINDS.INCIDENT) {
    errors.push(`Invalid kind: expected ${NOSTR_KINDS.INCIDENT}, got ${event.kind}`);
  }

  // Check required tags
  const requiredTags = [
    TAGS.IDENTIFIER,
    TAGS.GEOLOCATION,
    TAGS.TYPE,
    TAGS.SEVERITY,
    TAGS.SOURCE,
  ];

  for (const tag of requiredTags) {
    if (!getTagValue(event.tags, tag)) {
      errors.push(`Missing required tag: ${tag}`);
    }
  }

  // Validate geolocation format
  const geoTag = getTagValue(event.tags, TAGS.GEOLOCATION);
  if (geoTag && !parseGeolocation(geoTag)) {
    errors.push(`Invalid geolocation format: ${geoTag}`);
  }

  // Validate type
  const typeTag = getTagValue(event.tags, TAGS.TYPE);
  if (typeTag && !isIncidentType(typeTag)) {
    warnings.push(`Unknown incident type: ${typeTag}`);
  }

  // Validate severity
  const severityTag = getTagValue(event.tags, TAGS.SEVERITY);
  if (severityTag) {
    const sev = parseInt(severityTag, 10);
    if (!isSeverity(sev)) {
      errors.push(`Invalid severity: ${severityTag} (must be 1-5)`);
    }
  }

  // Validate content JSON
  try {
    const content = JSON.parse(event.content);
    if (!isIncidentEventContent(content)) {
      errors.push('Content JSON missing required fields');
    }
  } catch {
    errors.push('Content is not valid JSON');
  }

  // Check for geohash tag (recommended but not required)
  if (!getTagValue(event.tags, TAGS.GEOHASH)) {
    warnings.push('Missing geohash tag (recommended for filtering)');
  }

  // Check for address tag
  if (!getTagValue(event.tags, TAGS.ADDRESS)) {
    warnings.push('Missing address tag');
  }

  // Check for eventinel hashtag
  const hashtags = getTagValues(event.tags, TAGS.HASHTAG);
  if (!hashtags.includes(EVENTINEL_TAGS.APP)) {
    warnings.push('Missing eventinel hashtag');
  }

  // Check verification status
  const officialPubkey = process.env.EVENTINEL_OFFICIAL_PUBKEY_HEX;
  const isVerified = officialPubkey ? event.pubkey === officialPubkey : false;

  return {
    isValid: errors.length === 0,
    isVerified,
    errors,
    warnings,
  };
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { getTagValue, getTagValues, parseGeolocation };
