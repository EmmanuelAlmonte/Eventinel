import geohash from 'ngeohash';

import { INCIDENT_LIMITS } from '@lib/map/constants';

import {
  TAGS,
  EVENTINEL_TAGS,
  DEFAULT_GEOHASH_PRECISION,
} from '../config';

import type {
  CreateIncidentInput,
  IncidentEventContent,
} from './types';

type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

function getCryptoApi(): CryptoLike | undefined {
  return (globalThis as typeof globalThis & { crypto?: CryptoLike }).crypto;
}

function buildUuidFromBytes(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

function createIncidentId(): string {
  const cryptoApi = getCryptoApi();
  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues !== 'function') {
    throw new Error(
      'Secure RNG unavailable for incidentId generation. Ensure crypto.getRandomValues is loaded before creating incident events.'
    );
  }

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return buildUuidFromBytes(bytes);
}

function buildIncidentAlt(input: CreateIncidentInput): string {
  const alt = `Incident report: ${input.title}`;
  if (alt.length <= INCIDENT_LIMITS.MAX_EVENT_TAG_VALUE_LENGTH) {
    return alt;
  }

  return alt.slice(0, INCIDENT_LIMITS.MAX_EVENT_TAG_VALUE_LENGTH);
}

export function buildIncidentTags(input: CreateIncidentInput): string[][] {
  const incidentId = input.incidentId || createIncidentId();
  const hash = geohash.encode(
    input.location.lat,
    input.location.lng,
    DEFAULT_GEOHASH_PRECISION
  );

  return [
    [TAGS.IDENTIFIER, incidentId],
    [TAGS.GEOHASH, hash],
    [TAGS.LOCATION, input.location.address],
    [TAGS.TYPE, input.type],
    [TAGS.SEVERITY, input.severity.toString()],
    [TAGS.SOURCE, input.source],
    [TAGS.ADDRESS, input.location.address],
    [TAGS.ALT, buildIncidentAlt(input)],
    [TAGS.HASHTAG, EVENTINEL_TAGS.APP],
    [TAGS.HASHTAG, EVENTINEL_TAGS.INCIDENT],
    [TAGS.HASHTAG, input.type],
  ];
}

export function buildIncidentContent(input: CreateIncidentInput): IncidentEventContent {
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
