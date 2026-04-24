import type { NDKEvent } from '@nostr-dev-kit/mobile';

import type { ProcessedIncident, QueuedEvent } from '../../../hooks/incidentSubscription/types';
import type { ParsedIncident } from '../../../lib/nostr/events/types';

type IncidentLocationFixture = ParsedIncident['location'];

type ParsedIncidentOverrides = Omit<Partial<ParsedIncident>, 'location'> & {
  location?: Partial<IncidentLocationFixture>;
};

type ProcessedIncidentOverrides = Omit<Partial<ProcessedIncident>, 'location'> & {
  location?: Partial<IncidentLocationFixture>;
};

type IncidentEventOverrides = Partial<{
  eventId: string;
  content: string;
  tags: string[][];
  kind: number;
  pubkey: string;
}>;

type QueuedIncidentEventOverrides = IncidentEventOverrides & {
  source?: QueuedEvent['source'];
  subscriptionKey?: string;
  queueKey?: string;
};

export function buildIncidentLocation(
  incidentId = 'incident-1',
  overrides: Partial<IncidentLocationFixture> = {}
): IncidentLocationFixture {
  return {
    lat: 39.9526,
    lng: -75.1652,
    address: `Address ${incidentId}`,
    geohash: 'dr4e3f',
    ...overrides,
  };
}

export function buildParsedIncident(
  incidentId = 'incident-1',
  overrides: ParsedIncidentOverrides = {}
): ParsedIncident {
  const { location, ...incidentOverrides } = overrides;
  const eventId = incidentOverrides.eventId ?? `event-${incidentId}`;
  const createdAt = incidentOverrides.createdAt ?? 1_735_689_600;

  return {
    eventId,
    incidentId,
    pubkey: 'test-pubkey',
    createdAt,
    type: 'fire',
    severity: 3,
    title: `Incident ${incidentId}`,
    description: `Description ${incidentId}`,
    location: buildIncidentLocation(incidentId, location),
    occurredAt: new Date(createdAt * 1000),
    source: 'community',
    sourceId: `${incidentId}-source`,
    isVerified: false,
    ...incidentOverrides,
  };
}

export function buildProcessedIncident(
  incidentId = 'incident-1',
  overrides: ProcessedIncidentOverrides = {}
): ProcessedIncident {
  const { createdAtMs: createdAtMsOverride, occurredAtMs: occurredAtMsOverride, ...parsedOverrides } = overrides;
  const parsed = buildParsedIncident(incidentId, parsedOverrides);
  const createdAtMs = createdAtMsOverride ?? parsed.createdAt * 1000;
  const occurredAtMs = occurredAtMsOverride ?? parsed.occurredAt.getTime();

  return {
    ...parsed,
    createdAtMs,
    occurredAtMs,
  };
}

export function buildIncidentNdkEvent(
  incidentId = 'incident-1',
  createdAt = 1_735_689_600,
  overrides: IncidentEventOverrides = {}
): NDKEvent {
  return {
    id: overrides.eventId ?? `event-${incidentId}-${createdAt}`,
    kind: overrides.kind ?? 30911,
    pubkey: overrides.pubkey ?? 'test-pubkey',
    created_at: createdAt,
    content: overrides.content ?? '{}',
    tags: overrides.tags ?? [['d', incidentId]],
  } as unknown as NDKEvent;
}

export function buildQueuedIncidentEvent(
  incidentId = 'incident-1',
  createdAt = 1_735_689_600,
  overrides: QueuedIncidentEventOverrides = {}
): QueuedEvent {
  return {
    source: overrides.source ?? 'relay',
    subscriptionKey: overrides.subscriptionKey,
    queueKey: overrides.queueKey,
    event: buildIncidentNdkEvent(incidentId, createdAt, overrides),
  };
}
