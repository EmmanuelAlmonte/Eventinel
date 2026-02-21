import geohash from 'ngeohash';

import {
  TAGS,
  EVENTINEL_TAGS,
  DEFAULT_GEOHASH_PRECISION,
} from '../config';

import type {
  CreateIncidentInput,
  IncidentEventContent,
} from './types';

export function buildIncidentTags(input: CreateIncidentInput): string[][] {
  const incidentId = input.incidentId || crypto.randomUUID();
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
