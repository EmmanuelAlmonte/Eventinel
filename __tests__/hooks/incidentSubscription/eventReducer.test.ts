/**
 * Event reducer tests
 *
 * Focuses on batch-level delta collapse so downstream consumers only receive
 * the latest accepted revision for each incident.
 *
 * @jest-environment jsdom
 */

import { INCIDENT_LIMITS } from '../../../lib/map/constants';
import {
  applyIncidentEventBatch,
  getIncidentEventReducerMetrics,
  resetIncidentEventReducerMetrics,
} from '../../../hooks/incidentSubscription/eventReducer';
import {
  buildParsedIncident,
  buildQueuedIncidentEvent,
} from '../../fixtures/incident/buildIncident';

const mockParseIncidentEvent = jest.fn();

jest.mock('../../../lib/nostr/events/incident', () => ({
  parseIncidentEvent: (...args: unknown[]) => mockParseIncidentEvent(...args),
}));

describe('applyIncidentEventBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetIncidentEventReducerMetrics();
  });

  it('collapses multiple accepted revisions of the same incident to the latest batch delta', () => {
    const parsedByEventId = new Map([
      ['event-a-v1', buildParsedIncident('incident-a', { eventId: 'event-a-v1', createdAt: 100 })],
      ['event-b-v1', buildParsedIncident('incident-b', { eventId: 'event-b-v1', createdAt: 101 })],
      [
        'event-a-v2',
        buildParsedIncident('incident-a', {
          eventId: 'event-a-v2',
          createdAt: 102,
          severity: 4,
        }),
      ],
    ]);

    mockParseIncidentEvent.mockImplementation((event: { id: string }) => {
      return parsedByEventId.get(event.id) ?? null;
    });

    const result = applyIncidentEventBatch({
      queuedEvents: [
        buildQueuedIncidentEvent('incident-a', 100, { eventId: 'event-a-v1' }),
        buildQueuedIncidentEvent('incident-b', 101, { eventId: 'event-b-v1' }),
        buildQueuedIncidentEvent('incident-a', 102, { eventId: 'event-a-v2' }),
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
      ['event-a-v2', buildParsedIncident('incident-a', { eventId: 'event-a-v2', createdAt: 102 })],
      ['event-a-v1', buildParsedIncident('incident-a', { eventId: 'event-a-v1', createdAt: 101 })],
    ]);

    mockParseIncidentEvent.mockImplementation((event: { id: string }) => {
      return parsedByEventId.get(event.id) ?? null;
    });

    const result = applyIncidentEventBatch({
      queuedEvents: [
        buildQueuedIncidentEvent('incident-a', 102, { eventId: 'event-a-v2' }),
        buildQueuedIncidentEvent('incident-a', 101, { eventId: 'event-a-v1' }),
      ],
      incidentMap: new Map(),
      maxCandidateRetention: 1000,
      location: null,
      minCreatedAtUnixSeconds: null,
    });

    expect(result.updatedIncidents.map((incident) => incident.eventId)).toEqual(['event-a-v2']);
    expect(result.incidentMap.get('incident-a')?.eventId).toBe('event-a-v2');
  });

  it('caps parse candidates before parsing oversized batches', () => {
    const overflowCount = INCIDENT_LIMITS.MAX_PARSE_CANDIDATES + 5;
    const parsedByEventId = new Map(
      Array.from({ length: overflowCount }, (_, index) => {
        const createdAt = 100 + index;
        const incidentId = `incident-${index}`;
        const eventId = `event-${index}`;

        return [eventId, buildParsedIncident(incidentId, { eventId, createdAt })];
      })
    );

    mockParseIncidentEvent.mockImplementation((event: { id: string }) => {
      return parsedByEventId.get(event.id) ?? null;
    });

    const queuedEvents = Array.from({ length: overflowCount }, (_, index) =>
      buildQueuedIncidentEvent(`incident-${index}`, 100 + index, {
        eventId: `event-${index}`,
      })
    );

    const result = applyIncidentEventBatch({
      queuedEvents,
      incidentMap: new Map(),
      maxCandidateRetention: INCIDENT_LIMITS.CANDIDATE_RETENTION,
      maxParseCandidates: INCIDENT_LIMITS.MAX_PARSE_CANDIDATES,
      location: null,
      minCreatedAtUnixSeconds: null,
    });

    expect(mockParseIncidentEvent).toHaveBeenCalledTimes(
      INCIDENT_LIMITS.MAX_PARSE_CANDIDATES
    );
    expect(result.updatedIncidents).toHaveLength(INCIDENT_LIMITS.MAX_PARSE_CANDIDATES);
    expect(
      result.updatedIncidents.some((incident) => incident.incidentId === 'incident-0')
    ).toBe(false);
    expect(
      result.updatedIncidents.some(
        (incident) => incident.incidentId === `incident-${overflowCount - 1}`
      )
    ).toBe(true);
    expect(getIncidentEventReducerMetrics().parseCandidateDrops).toBe(
      overflowCount - INCIDENT_LIMITS.MAX_PARSE_CANDIDATES
    );
  });

  it('passes author Blossom server fallbacks into incident parsing', () => {
    const queued = buildQueuedIncidentEvent('incident-with-media', 100, {
      eventId: 'event-with-media',
      pubkey: 'author-pubkey',
    });
    mockParseIncidentEvent.mockReturnValue(
      buildParsedIncident('incident-with-media', {
        eventId: 'event-with-media',
        pubkey: 'author-pubkey',
        createdAt: 100,
      })
    );

    applyIncidentEventBatch({
      queuedEvents: [queued],
      incidentMap: new Map(),
      maxCandidateRetention: 1000,
      location: null,
      minCreatedAtUnixSeconds: null,
      authorBlossomServerUrlsByPubkey: new Map([
        ['author-pubkey', ['https://fallback.example.com/path']],
      ]),
    });

    expect(mockParseIncidentEvent).toHaveBeenCalledWith(queued.event, {
      authorBlossomServerUrls: ['https://fallback.example.com/path'],
    });
  });
});
