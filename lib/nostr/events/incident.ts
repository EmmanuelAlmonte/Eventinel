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
import type { Severity } from '../config';

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
import { buildIncidentContent, buildIncidentTags } from './incidentBuilder';
import {
  getTagValue,
  getTagValues,
  parseGeolocation,
  parseContentLocation,
} from './incidentTagHelpers';

type ParsedIncidentTags = {
  incidentId: string;
  geohashTag?: string;
  typeTag: string;
  severityTag: string;
  sourceTag: string;
  addressTag?: string;
};

function extractParsedIncidentTags(tags: string[][]): ParsedIncidentTags | null {
  const incidentId = getTagValue(tags, TAGS.IDENTIFIER);
  const typeTag = getTagValue(tags, TAGS.TYPE);
  const severityTag = getTagValue(tags, TAGS.SEVERITY);
  const sourceTag = getTagValue(tags, TAGS.SOURCE);
  const addressTag = getTagValue(tags, TAGS.ADDRESS);
  const geohashTag = getTagValue(tags, TAGS.GEOHASH);

  if (!incidentId || !typeTag || !severityTag || !sourceTag) {
    return null;
  }

  return {
    incidentId,
    typeTag,
    severityTag,
    sourceTag,
    addressTag,
    geohashTag,
  };
}

function parseIncidentContent(content: string): IncidentEventContent | null {
  try {
    const parsed = JSON.parse(content);
    if (!isIncidentEventContent(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseAndValidateSeverity(value: string): Severity | null {
  const severity = parseInt(value, 10);
  return isSeverity(severity) ? (severity as Severity) : null;
}

function resolveVerification(
  event: NDKEvent,
  verifiedPubkeys?: Set<string>
): boolean {
  const officialPubkey = process.env.EVENTINEL_OFFICIAL_PUBKEY_HEX;
  return (
    (officialPubkey && event.pubkey === officialPubkey) ||
    (verifiedPubkeys?.has(event.pubkey) ?? false)
  );
}

function appendMissingRequiredTags(tags: string[][], errors: string[]): void {
  const requiredTags = [
    TAGS.IDENTIFIER,
    TAGS.TYPE,
    TAGS.SEVERITY,
    TAGS.SOURCE,
  ];

  for (const tag of requiredTags) {
    if (!getTagValue(tags, tag)) {
      errors.push(`Missing required tag: ${tag}`);
    }
  }
}

function appendTypeAndSeverityIssues(
  tags: string[][],
  errors: string[],
  warnings: string[]
): void {
  const typeTag = getTagValue(tags, TAGS.TYPE);
  if (typeTag && !isIncidentType(typeTag)) {
    warnings.push(`Unknown incident type: ${typeTag}`);
  }

  const severityTag = getTagValue(tags, TAGS.SEVERITY);
  if (!severityTag) return;

  const severity = parseAndValidateSeverity(severityTag);
  if (severity === null) {
    errors.push(`Invalid severity: ${severityTag} (must be 1-5)`);
  }
}

function appendContentValidation(content: string, errors: string[]): void {
  try {
    const parsedContent = JSON.parse(content);
    if (!isIncidentEventContent(parsedContent)) {
      errors.push('Content JSON missing required fields');
    }
  } catch {
    errors.push('Content is not valid JSON');
  }
}

function appendRecommendedTagWarnings(tags: string[][], warnings: string[]): void {
  if (!getTagValue(tags, TAGS.GEOHASH)) {
    warnings.push('Missing geohash tag (recommended for filtering)');
  }

  if (!getTagValue(tags, TAGS.LOCATION)) {
    warnings.push('Missing location tag (recommended for NIP-52 compatibility)');
  }

  if (!getTagValue(tags, TAGS.ADDRESS)) {
    warnings.push('Missing address tag');
  }

  const hashtags = getTagValues(tags, TAGS.HASHTAG);
  if (!hashtags.includes(EVENTINEL_TAGS.APP)) {
    warnings.push('Missing eventinel hashtag');
  }
}

/**
 * Creates an unsigned NDKEvent for an incident.
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

/**
 * Parses an NDKEvent into a structured ParsedIncident.
 */
export function parseIncidentEvent(
  event: NDKEvent,
  verifiedPubkeys?: Set<string>
): ParsedIncident | null {
  if (event.kind !== NOSTR_KINDS.INCIDENT) return null;

  const parsedTags = extractParsedIncidentTags(event.tags);
  if (!parsedTags) return null;

  if (!isIncidentType(parsedTags.typeTag)) return null;
  if (!isDataSource(parsedTags.sourceTag)) return null;

  const severity = parseAndValidateSeverity(parsedTags.severityTag);
  if (severity === null) return null;

  const content = parseIncidentContent(event.content);
  if (!content) return null;

  const geo = parseContentLocation(content.lat, content.lng);
  if (!geo) return null;

  return {
    eventId: event.id,
    incidentId: parsedTags.incidentId,
    pubkey: event.pubkey,
    createdAt: event.created_at ?? Math.floor(Date.now() / 1000),
    type: parsedTags.typeTag,
    severity,
    title: content.title,
    description: content.description,
    location: {
      lat: geo.lat,
      lng: geo.lng,
      address: parsedTags.addressTag || content.title,
      city: content.city,
      state: content.state,
      geohash:
        parsedTags.geohashTag ||
        geohash.encode(geo.lat, geo.lng, DEFAULT_GEOHASH_PRECISION),
    },
    occurredAt: new Date(content.occurredAt),
    source: parsedTags.sourceTag,
    sourceId: content.sourceId,
    isVerified: resolveVerification(event, verifiedPubkeys),
    metadata: content.metadata,
  };
}

/**
 * Validates an incident event structure without parsing.
 */
export function validateIncidentEvent(event: NDKEvent): VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (event.kind !== NOSTR_KINDS.INCIDENT) {
    errors.push(`Invalid kind: expected ${NOSTR_KINDS.INCIDENT}, got ${event.kind}`);
  }

  appendMissingRequiredTags(event.tags, errors);
  appendTypeAndSeverityIssues(event.tags, errors, warnings);
  appendContentValidation(event.content, errors);
  appendRecommendedTagWarnings(event.tags, warnings);

  const officialPubkey = process.env.EVENTINEL_OFFICIAL_PUBKEY_HEX;
  const isVerified = officialPubkey ? event.pubkey === officialPubkey : false;

  return {
    isValid: errors.length === 0,
    isVerified,
    errors,
    warnings,
  };
}

export { getTagValue, getTagValues, parseGeolocation };
