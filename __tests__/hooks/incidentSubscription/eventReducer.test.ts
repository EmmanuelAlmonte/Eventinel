/**
 * Event reducer tests
 *
 * Focuses on batch-level delta collapse so downstream consumers only receive
 * the latest accepted revision for each incident.
 *
 * @jest-environment jsdom
 */

import type { NDKEvent } from '@nostr-dev-kit/mobile';
import type { ParsedIncident } from '../../../lib/nostr/events/types';
import { applyIncidentEventBatch } from '../../../hooks/incidentSubscription/eventReducer';
import type { QueuedEvent } from '../../../hooks/incidentSubscription/types';

const mockParseIncidentEvent = jest.fn();

jest.mock('../../../lib/nostr/events/incident', () => ({
  parseIncidentEvent: (...args: unknown[]) => mockParseIncidentEvent(...args),
}));

function createParsedIncident(
  incidentId: string,
  eventId: string,
  createdAt: number,
  overrides: Partial<ParsedIncident> = {}
): ParsedIncident {
  return {
    eventId,
    incidentId,
    pubkey: 'test-pubkey',
    createdAt,
    type: 'fire',
    severity: 3,
    title: `Incident ${incidentId}`,
    description: `Description ${incidentId}`,
    location: {
      lat: 39.9526,
      lng: -75.1652,
      address: `Address ${incidentId}`,
      geohash: 'dr4e3f',
    },
    occurredAt: new Date(createdAt * 1000),
    source: 'community',
    sourceId: `${incidentId}-source`,
    isVerified: false,
    ...overrides,
  };
}

function createQueuedEvent(incidentId: string, eventId: string, createdAt: number): QueuedEvent {
  return {
    source: 'relay' as const,
    event: {
      id: eventId,
      kind: 30911,
      created_at: createdAt,
      tags: [['d', incidentId]],
      content: '{}',
    } as unknown as NDKEvent,
  };
}

describe('applyIncidentEventBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('collapses multiple accepted revisions of the same incident to the latest batch delta', () => {
    const parsedByEventId = new Map([
      ['event-a-v1', createParsedIncident('incident-a', 'event-a-v1', 100)],
      ['event-b-v1', createParsedIncident('incident-b', 'event-b-v1', 101)],
      ['event-a-v2', createParsedIncident('incident-a', 'event-a-v2', 102, { severity: 4 })],
    ]);

    mockParseIncidentEvent.mockImplementation((event: { id: string }) => {
      return parsedByEventId.get(event.id) ?? null;
    });

    const result = applyIncidentEventBatch({
      queuedEvents: [
        createQueuedEvent('incident-a', 'event-a-v1', 100),
        createQueuedEvent('incident-b', 'event-b-v1', 101),
        createQueuedEvent('incident-a', 'event-a-v2', 102),
      ],
      incidentMap: new Map(),
      maxCandidateRetention: 1000,
      location: null,
      minCreatedAtUnixSeconds: null,
    });

    expect(result.didUpdate).toBe(true);
    expect(result.updatedIncidents.map((incident) => incident.eventId)).toEqual([
      'event-b-v1',
      'event-a-v2',
    ]);
    expect(result.incidentMap.get('incident-a')?.eventId).toBe('event-a-v2');
    expect(result.incidentMap.get('incident-b')?.eventId).toBe('event-b-v1');
  });

  it('does not emit an older later-in-batch revision after a newer one already won', () => {
    const parsedByEventId = new Map([
      ['event-a-v2', createParsedIncident('incident-a', 'event-a-v2', 102)],
      ['event-a-v1', createParsedIncident('incident-a', 'event-a-v1', 101)],
    ]);

    mockParseIncidentEvent.mockImplementation((event: { id: string }) => {
      return parsedByEventId.get(event.id) ?? null;
    });

    const result = applyIncidentEventBatch({
      queuedEvents: [
        createQueuedEvent('incident-a', 'event-a-v2', 102),
        createQueuedEvent('incident-a', 'event-a-v1', 101),
      ],
      incidentMap: new Map(),
      maxCandidateRetention: 1000,
      location: null,
      minCreatedAtUnixSeconds: null,
    });

    expect(result.updatedIncidents.map((incident) => incident.eventId)).toEqual(['event-a-v2']);
    expect(result.incidentMap.get('incident-a')?.eventId).toBe('event-a-v2');
  });
});
