/**
 * useIncidentSubscription Hook Tests
 *
 * Tests the incident subscription hook including:
 * - Simple global NDK filter construction
 * - Event parsing and deduplication
 * - Severity counting
 * - Loading states
 * - Enabled/disabled behavior
 *
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react-native';

// Import mock helpers
import {
  mockSubscription,
  mockNDKHooks,
} from '../../__mocks__/@nostr-dev-kit/mobile';
import { INCIDENT_LIMITS } from '../../lib/map/constants';

// Mock ngeohash
jest.mock('ngeohash', () => ({
  encode: jest.fn((lat: number, lng: number, precision: number) => {
    // Return a deterministic hash based on coordinates
    return `gh${Math.abs(lat).toFixed(0)}${Math.abs(lng).toFixed(0)}`;
  }),
  neighbors: jest.fn((hash: string) => ({
    n: hash + 'n',
    ne: hash + 'ne',
    e: hash + 'e',
    se: hash + 'se',
    s: hash + 's',
    sw: hash + 'sw',
    w: hash + 'w',
    nw: hash + 'nw',
  })),
}));

jest.mock('@lib/ndk', () => ({
  ndk: mockNDKHooks.getNDK(),
}));

// Mock the incident parser
jest.mock('@lib/nostr/events/incident', () => ({
  parseIncidentEvent: jest.fn((event) => {
    // Simple mock parser that extracts data from event
    try {
      const content = JSON.parse(event.content);
      const dTag = event.tags?.find((t: string[]) => t[0] === 'd');
      const severityTag = event.tags?.find((t: string[]) => t[0] === 'severity');

      return {
        eventId: event.id,
        incidentId: dTag?.[1] || event.id,
        pubkey: event.pubkey,
        createdAt: event.created_at || Math.floor(Date.now() / 1000),
        type: content.type || 'other',
        severity: parseInt(severityTag?.[1] || '1', 10),
        title: content.title || 'Test Incident',
        description: content.description || '',
        location: {
          lat: content.lat ?? 0,
          lng: content.lng ?? 0,
          address: content.address || '',
          geohash: event.tags?.find((tag: string[]) => tag[0] === 'g')?.[1] ?? 'gh4075',
        },
        occurredAt: content.occurredAt ? new Date(content.occurredAt) : new Date(),
        source: content.source || 'community',
        sourceId: content.sourceId || 'test-123',
        isVerified: false,
      };
    } catch {
      return null;
    }
  }),
  getTagValue: jest.fn((tags: string[][], tagName: string) => {
    const tag = tags?.find((t) => t[0] === tagName);
    return tag?.[1];
  }),
  getTagValues: jest.fn((tags: string[][], tagName: string) => {
    return (tags ?? []).filter((t) => t[0] === tagName).map((t) => t[1]);
  }),
  parseGeolocation: jest.fn((geoTag: string | undefined) => {
    if (!geoTag) return null;

    const parts = geoTag.split(',');
    if (parts.length !== 2) return null;

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { lat, lng };
  }),
}));

// Import the hook after mocks
import { useIncidentSubscription } from '../../hooks/useIncidentSubscription';
import type { UseIncidentSubscriptionOptions } from '../../hooks/useIncidentSubscription';

// =============================================================================
// HELPERS
// =============================================================================

let mockEventSequence = 0;

function nextMockId(prefix: string): string {
  mockEventSequence += 1;
  return `${prefix}_${mockEventSequence}`;
}

function createMockIncidentEvent(overrides: Partial<any> = {}) {
  const id = overrides.id ?? nextMockId('event');
  const incidentId = overrides.incidentId ?? nextMockId('incident');
  const severity = overrides.severity ?? 3;
  const createdAt = overrides.created_at ?? Math.floor(Date.now() / 1000);
  const occurredAt = overrides.occurredAt ?? new Date().toISOString();

  return {
    id,
    pubkey: overrides.pubkey ?? 'mock_pubkey',
    kind: 30911,
    created_at: createdAt,
    tags: [
      ['d', incidentId],
      ['severity', String(severity)],
      ['g', 'gh4075'],
      ['t', 'incident'],
      ...(overrides.tags ?? []),
    ],
    content: JSON.stringify({
      title: overrides.title ?? 'Test Incident',
      description: overrides.description ?? 'Test description',
      lat: overrides.lat ?? 39.9526,
      lng: overrides.lng ?? -75.1652,
      type: overrides.type ?? 'fire',
      severity,
      occurredAt,
      source: overrides.source ?? 'community',
      sourceId: overrides.sourceId ?? 'test-123',
    }),
  };
}

function getSubscribeCalls() {
  return mockNDKHooks.getNDK().subscribe.mock.calls;
}

// =============================================================================
// TEST SETUP
// =============================================================================

describe('useIncidentSubscription', () => {
  beforeEach(() => {
    mockSubscription.reset();
    jest.clearAllMocks();
    mockEventSequence = 0;
  });

  // =============================================================================
  // INITIAL STATE TESTS
  // =============================================================================

  describe('Initial State', () => {
    it('returns empty incidents array initially', () => {
      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      expect(result.current.incidents).toEqual([]);
    });

    it('returns isInitialLoading as true before EOSE', () => {
      mockSubscription.setEose(false);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      expect(result.current.isInitialLoading).toBe(true);
    });

    it('returns hasReceivedHistory as false before EOSE', () => {
      mockSubscription.setEose(false);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      expect(result.current.hasReceivedHistory).toBe(false);
    });

    it('returns zero severity counts initially', () => {
      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      expect(result.current.severityCounts).toEqual({
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      });
    });

    it('returns totalEventsReceived as 0 initially', () => {
      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      expect(result.current.totalEventsReceived).toBe(0);
    });

    it('returns lastUpdatedAt as null initially', () => {
      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      expect(result.current.lastUpdatedAt).toBeNull();
    });
  });

  // =============================================================================
  // FILTER CONSTRUCTION TESTS
  // =============================================================================

  describe('Filter Construction', () => {
    it('does not subscribe when location is null (no desired geohash cells)', () => {
      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: null,
        })
      );

      expect(getSubscribeCalls().length).toBe(0);
      expect(result.current.incidents).toEqual([]);
      expect(result.current.totalEventsReceived).toBe(0);
      expect(result.current.hasReceivedHistory).toBe(true);
      expect(result.current.isInitialLoading).toBe(false);
    });

    it('subscribes when location is provided', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      // Subscription should be created with a geohash filter.
      const calls = getSubscribeCalls();
      expect(calls.length).toBeGreaterThan(0);
      const hasGeoHashFilter = calls.some((call) => {
        const filters = call[0] as unknown[];
        return Array.isArray(filters) && filters.some((filter: any) => filter['#g']);
      });
      expect(hasGeoHashFilter).toBe(true);
    });

    it('does not build filters when location is null', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: null,
        })
      );

      expect(getSubscribeCalls().length).toBe(0);
    });
  });

  // =============================================================================
  // ENABLED/DISABLED TESTS
  // =============================================================================

  describe('Enabled/Disabled', () => {
    it('does not subscribe when enabled is false', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
          enabled: false,
        })
      );

      expect(mockNDKHooks.getNDK().subscribe).not.toHaveBeenCalled();
    });

    it('subscribes when enabled is true (default)', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
          enabled: true,
        })
      );

      expect(mockNDKHooks.getNDK().subscribe).toHaveBeenCalled();
    });

    it('preserves incidents when disabling while location is still available', async () => {
      const mockEvent = createMockIncidentEvent({
        title: 'Persist Me',
        severity: 2,
      });
      mockSubscription.setEvents([mockEvent]);
      mockSubscription.setEose(true);

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useIncidentSubscription({
            location: [-75.1652, 39.9526],
            enabled,
          }),
        {
          initialProps: { enabled: true },
        }
      );

      await waitFor(() => {
        expect(result.current.incidents.length).toBe(1);
      });

      rerender({ enabled: false });

      expect(result.current.incidents.length).toBe(1);
      expect(result.current.incidents[0].title).toBe('Persist Me');
      expect(result.current.incidents[0].severity).toBe(2);
    });
  });

  // =============================================================================
  // EVENT PARSING TESTS
  // =============================================================================

  describe('Event Parsing', () => {
    it('parses events into incidents', async () => {
      const mockEvent = createMockIncidentEvent({
        title: 'Fire on Main St',
        severity: 4,
      });
      mockSubscription.setEvents([mockEvent]);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      await waitFor(() => {
        expect(result.current.incidents.length).toBe(1);
        expect(result.current.incidents[0].title).toBe('Fire on Main St');
        expect(result.current.incidents[0].severity).toBe(4);
      });
    });

    it('filters out invalid events', async () => {
      const validEvent = createMockIncidentEvent({ title: 'Valid' });
      const invalidEvent = {
        id: 'invalid',
        kind: 30911,
        content: 'not-json', // Invalid JSON
        tags: [],
      };

      mockSubscription.setEvents([validEvent, invalidEvent]);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      await waitFor(() => {
        expect(result.current.incidents.length).toBe(1);
        expect(result.current.incidents[0].title).toBe('Valid');
      });
    });

    it('adds createdAtMs and occurredAtMs to processed incidents', async () => {
      const createdAt = Math.floor(Date.now() / 1000);
      const occurredAt = new Date().toISOString();

      const mockEvent = createMockIncidentEvent({
        created_at: createdAt,
        occurredAt,
      });
      mockSubscription.setEvents([mockEvent]);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      await waitFor(() => {
        expect(result.current.incidents[0].createdAtMs).toBe(createdAt * 1000);
        expect(typeof result.current.incidents[0].occurredAtMs).toBe('number');
      });
    });
  });

  // =============================================================================
  // DEDUPLICATION TESTS
  // =============================================================================

  describe('Deduplication', () => {
    it('deduplicates events by incidentId', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const incidentId = 'duplicate-incident';
      const event1 = createMockIncidentEvent({
        incidentId,
        created_at: nowSec - 10,
        title: 'First Version',
      });
      const event2 = createMockIncidentEvent({
        incidentId,
        created_at: nowSec - 5,
        title: 'Second Version',
      });

      mockSubscription.setEvents([event1, event2]);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      await waitFor(() => {
        expect(result.current.incidents.length).toBe(1);
      });
    });

    it('keeps the latest version by createdAt', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const incidentId = 'duplicate-incident';
      const event1 = createMockIncidentEvent({
        incidentId,
        created_at: nowSec - 10,
        title: 'Old Version',
      });
      const event2 = createMockIncidentEvent({
        incidentId,
        created_at: nowSec - 5,
        title: 'New Version',
      });

      mockSubscription.setEvents([event1, event2]);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      await waitFor(() => {
        expect(result.current.incidents[0].title).toBe('New Version');
      });
    });

    it('handles events with same incidentId regardless of order', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const incidentId = 'duplicate-incident';
      // Newer event comes first in array
      const newerEvent = createMockIncidentEvent({
        incidentId,
        created_at: nowSec - 5,
        title: 'Newer',
      });
      const olderEvent = createMockIncidentEvent({
        incidentId,
        created_at: nowSec - 10,
        title: 'Older',
      });

      mockSubscription.setEvents([newerEvent, olderEvent]);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      await waitFor(() => {
        expect(result.current.incidents.length).toBe(1);
        expect(result.current.incidents[0].title).toBe('Newer');
      });
    });
  });

  // =============================================================================
  // SORTING TESTS
  // =============================================================================

  describe('Sorting', () => {
    it('prioritizes nearer incidents ahead of newer but farther incidents', async () => {
      const now = Date.now();
      const nearOlder = createMockIncidentEvent({
        id: 'event-near',
        incidentId: 'incident-near',
        title: 'Nearby Older',
        occurredAt: new Date(now - 60_000).toISOString(),
        lat: 39.953,
        lng: -75.165,
      });
      const farNewer = createMockIncidentEvent({
        id: 'event-far',
        incidentId: 'incident-far',
        title: 'Far Newer',
        occurredAt: new Date(now).toISOString(),
        lat: 34.0522,
        lng: -118.2437,
      });

      mockSubscription.setEvents([farNewer, nearOlder]);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      await waitFor(() => {
        expect(result.current.incidents.length).toBe(2);
        expect(result.current.incidents[0].title).toBe('Nearby Older');
        expect(result.current.incidents[1].title).toBe('Far Newer');
      });
    });

    it('uses occurredAt descending when incident distances are equal', async () => {
      const now = Date.now();
      const event1 = createMockIncidentEvent({
        incidentId: 'older',
        occurredAt: new Date(now - 10000).toISOString(),
        title: 'Older Incident',
      });
      const event2 = createMockIncidentEvent({
        incidentId: 'newer',
        occurredAt: new Date(now).toISOString(),
        title: 'Newer Incident',
      });

      mockSubscription.setEvents([event1, event2]);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      await waitFor(() => {
        expect(result.current.incidents.length).toBe(2);
        expect(result.current.incidents[0].title).toBe('Newer Incident');
        expect(result.current.incidents[1].title).toBe('Older Incident');
      });
    });

    it('uses incidentId as a stable tie-breaker when distance and recency match', async () => {
      const fixedOccurredAt = '2026-01-01T12:00:00.000Z';

      const incidentB = createMockIncidentEvent({
        id: 'event-b',
        incidentId: 'incident-b',
        title: 'Incident B',
        occurredAt: fixedOccurredAt,
        lat: 40.7128,
        lng: -74.006,
      });
      const incidentA = createMockIncidentEvent({
        id: 'event-a',
        incidentId: 'incident-a',
        title: 'Incident A',
        occurredAt: fixedOccurredAt,
        lat: 40.7128,
        lng: -74.006,
      });

      mockSubscription.setEvents([incidentB, incidentA]);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-74.006, 40.7128],
        })
      );

      await waitFor(() => {
        expect(result.current.incidents.length).toBe(2);
        expect(result.current.incidents[0].incidentId).toBe('incident-a');
        expect(result.current.incidents[1].incidentId).toBe('incident-b');
      });
    });

    it('re-sorts existing incidents when location changes', async () => {
      const fixedOccurredAt = '2026-01-01T12:00:00.000Z';

      const phillyIncident = createMockIncidentEvent({
        id: 'event-philly',
        incidentId: 'incident-philly',
        title: 'Philadelphia Incident',
        occurredAt: fixedOccurredAt,
        lat: 39.9526,
        lng: -75.1652,
      });
      const nycIncident = createMockIncidentEvent({
        id: 'event-nyc',
        incidentId: 'incident-nyc',
        title: 'NYC Incident',
        occurredAt: fixedOccurredAt,
        lat: 40.7128,
        lng: -74.006,
      });

      mockSubscription.setEvents([phillyIncident, nycIncident]);
      mockSubscription.setEose(true);

      const { result, rerender } = renderHook(
        (props: UseIncidentSubscriptionOptions) => useIncidentSubscription(props),
        {
          initialProps: { location: [-75.1652, 39.9526] },
        }
      );

      await waitFor(() => {
        expect(result.current.incidents[0].incidentId).toBe('incident-philly');
      });

      rerender({ location: [-74.006, 40.7128] });

      await waitFor(() => {
        expect(result.current.incidents[0].incidentId).toBe('incident-nyc');
      });
    });
  });

  // =============================================================================
  // MAX INCIDENTS LIMIT TESTS
  // =============================================================================

  describe('Max Incidents Limit', () => {
    it('limits incidents to maxIncidents option', async () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createMockIncidentEvent({
          incidentId: `incident-${i}`,
          occurredAt: new Date(Date.now() - i * 1000).toISOString(),
        })
      );

      mockSubscription.setEvents(events);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
          maxIncidents: 5,
        })
      );

      await waitFor(() => {
        expect(result.current.incidents.length).toBe(5);
      });
    });

    it('keeps the newest incidents when limiting', async () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createMockIncidentEvent({
          incidentId: `incident-${i}`,
          title: `Incident ${i}`,
          occurredAt: new Date(Date.now() - i * 10000).toISOString(),
        })
      );

      mockSubscription.setEvents(events);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
          maxIncidents: 3,
        })
      );

      await waitFor(() => {
        // Should have the 3 newest (indices 0, 1, 2 from sorted)
        expect(result.current.incidents[0].title).toBe('Incident 0');
        expect(result.current.incidents[2].title).toBe('Incident 2');
      });
    });
  });

  // =============================================================================
  // SEVERITY COUNTS TESTS
  // =============================================================================

  describe('Severity Counts', () => {
    it('counts severity levels correctly', async () => {
      const events = [
        createMockIncidentEvent({ incidentId: 'a', severity: 1 }),
        createMockIncidentEvent({ incidentId: 'b', severity: 2 }),
        createMockIncidentEvent({ incidentId: 'c', severity: 3 }),
        createMockIncidentEvent({ incidentId: 'd', severity: 3 }),
        createMockIncidentEvent({ incidentId: 'e', severity: 5 }),
      ];

      mockSubscription.setEvents(events);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      await waitFor(() => {
        expect(result.current.severityCounts).toEqual({
          1: 1,
          2: 1,
          3: 2,
          4: 0,
          5: 1,
        });
      });
    });

    it('counts only displayed incidents (post-slice)', async () => {
      // Create 10 incidents, all severity 5
      const events = Array.from({ length: 10 }, (_, i) =>
        createMockIncidentEvent({
          incidentId: `incident-${i}`,
          severity: 5,
          occurredAt: new Date(Date.now() - i * 1000).toISOString(),
        })
      );

      mockSubscription.setEvents(events);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
          maxIncidents: 3, // Only show 3
        })
      );

      await waitFor(() => {
        // Should only count 3 severity-5 incidents
        expect(result.current.severityCounts[5]).toBe(3);
      });
    });
  });

  // =============================================================================
  // LOADING STATE TESTS
  // =============================================================================

  describe('Loading States', () => {
    it('sets isInitialLoading to false after EOSE', async () => {
      mockSubscription.setEose(false);

      const { result, rerender } = renderHook(
        (props: UseIncidentSubscriptionOptions) => useIncidentSubscription(props),
        { initialProps: { location: [-75.1652, 39.9526] } }
      );

      expect(result.current.isInitialLoading).toBe(true);

      mockSubscription.setEose(true);
      rerender({ location: [-75.1652, 39.9526] });

      await waitFor(() => {
        expect(result.current.isInitialLoading).toBe(false);
      });
    });

    it('sets hasReceivedHistory to true after EOSE', async () => {
      mockSubscription.setEose(false);

      const { result, rerender } = renderHook(
        (props: UseIncidentSubscriptionOptions) => useIncidentSubscription(props),
        { initialProps: { location: [-75.1652, 39.9526] } }
      );

      expect(result.current.hasReceivedHistory).toBe(false);

      mockSubscription.setEose(true);
      rerender({ location: [-75.1652, 39.9526] });

      await waitFor(() => {
        expect(result.current.hasReceivedHistory).toBe(true);
      });
    });
  });

  // =============================================================================
  // RECONCILIATION + LIFECYCLE TESTS
  // =============================================================================

  describe('Reconcile and Lifecycle', () => {
    it('starts and stops subscriptions when desired geohash cells change', async () => {
      const { rerender } = renderHook(
        ({ location }) =>
          useIncidentSubscription({
            location,
          }),
        {
          initialProps: { location: [-75.1652, 39.9526] as [number, number] },
        }
      );

      const startCalls = getSubscribeCalls();
      const initialCount = startCalls.length;
      const initialStops = mockNDKHooks.getNDK().subscribe.mock.results
        .map((result) => (result.value ?? null) as { stop: jest.Mock })
        .filter(Boolean)
        .map((entry) => entry.stop);

      rerender({ location: [40.7128, -74.006] as [number, number] });

      await waitFor(() => {
        expect(getSubscribeCalls().length).toBeGreaterThan(initialCount);
        const hadStop = initialStops.some((stop) => stop.mock.calls.length > 0);
        expect(hadStop).toBe(true);
      });
    });

    it('batches cache and relay updates into a single flush window', async () => {
      const createdAt = Math.floor(Date.now() / 1000);
      const cacheEvent = createMockIncidentEvent({
        incidentId: 'shared-incident',
        created_at: createdAt,
        title: 'Cache',
      });
      const relayEvent = createMockIncidentEvent({
        incidentId: 'shared-incident',
        created_at: createdAt + 5,
        title: 'Relay',
      });

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );
      const subscriptionCount = getSubscribeCalls().length;
      mockSubscription.setEvents([cacheEvent]);
      mockSubscription.addEvent(relayEvent);
      mockSubscription.setEose(true);

      await waitFor(() => {
        expect(result.current.totalEventsReceived).toBe(subscriptionCount * 2);
        expect(result.current.incidents).toHaveLength(1);
        expect(result.current.incidents[0].title).toBe('Relay');
        expect(result.current.updatedIncidents.some((incident) => incident.title === 'Relay')).toBe(true);
      });
    });
  });

  // =============================================================================
  // PRUNE + CELL CHANGES
  // =============================================================================

  describe('Cell Pruning', () => {
    it('prunes incidents that are no longer inside desired geohash cells', async () => {
      const { result, rerender } = renderHook(
        ({ location }) =>
          useIncidentSubscription({
            location,
          }),
        {
          initialProps: { location: [-75.1652, 39.9526] as [number, number] },
        }
      );

      const farCellEvent = createMockIncidentEvent({
        incidentId: 'pruned',
        title: 'Pruned Incident',
        tags: [['d', 'pruned'], ['g', 'gh000000'], ['t', 'incident']],
      });

      mockSubscription.setEose(true);
      mockSubscription.setEvents([farCellEvent]);

      await waitFor(() => {
        expect(result.current.incidents).toHaveLength(1);
      });

      rerender({ location: [-74.006, 40.7128] as [number, number] });

      await waitFor(() => {
        expect(result.current.incidents).toHaveLength(0);
      });
    });
  });

  // =============================================================================
  // TOTAL EVENTS RECEIVED TESTS
  // =============================================================================

  describe('Total Events Received', () => {
    it('returns total events including invalid ones', async () => {
      const validEvent = createMockIncidentEvent({ title: 'Valid' });
      const invalidEvent = {
        id: 'invalid',
        kind: 30911,
        content: 'not-json',
        tags: [],
      };

      mockSubscription.setEvents([validEvent, invalidEvent]);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );
      const subscriptionCount = getSubscribeCalls().length;

      await waitFor(() => {
        expect(result.current.totalEventsReceived).toBe(subscriptionCount * 2);
        expect(result.current.incidents.length).toBe(1);
      });
    });
  });

  // =============================================================================
  // SIMPLE FILTER TESTS
  // =============================================================================

  describe('Empty Desired Cells', () => {
    it('subscribes to no relays and resolves loading when location is null', () => {
      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: null,
          maxIncidents: 9999, // Runtime cap should still be 200
        })
      );

      expect(getSubscribeCalls().length).toBe(0);
      expect(result.current.incidents).toEqual([]);
      expect(result.current.totalEventsReceived).toBe(0);
      expect(result.current.hasReceivedHistory).toBe(true);
      expect(result.current.isInitialLoading).toBe(false);
    });
  });

  // =============================================================================
  // SUBSCRIPTION OPTIONS TESTS
  // =============================================================================

  describe('Subscription Options', () => {
    it('uses CACHE_FIRST cache usage', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      const filterCall = getSubscribeCalls()[0];
      const options = filterCall[1];

      expect(options.cacheUsage).toBe('CACHE_FIRST');
    });

    it('sets closeOnEose to false for live updates', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      const filterCall = getSubscribeCalls()[0];
      const options = filterCall[1];

      expect(options.closeOnEose).toBe(false);
    });

    it('sets groupable to false to avoid race conditions', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      const filterCall = getSubscribeCalls()[0];
      const options = filterCall[1];

      expect(options.groupable).toBe(false);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('handles empty events array', async () => {
      mockSubscription.setEvents([]);
      mockSubscription.setEose(true);

      const { result } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      await waitFor(() => {
        expect(result.current.incidents).toEqual([]);
        expect(result.current.totalEventsReceived).toBe(0);
        expect(result.current.hasReceivedHistory).toBe(true);
      });
    });

    it('handles location at equator/prime meridian', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [0, 0],
        })
      );

      expect(mockNDKHooks.getNDK().subscribe).toHaveBeenCalled();
    });

    it('handles location change without altering simple filter', () => {
      const { rerender } = renderHook(
        ({ location }) =>
          useIncidentSubscription({
            location,
          }),
        {
          initialProps: { location: [-75.1652, 39.9526] as [number, number] },
        }
      );

      rerender({ location: [-74.006, 40.7128] as [number, number] });

      const calls = getSubscribeCalls();
      const globalFilterCall = calls.find(([filters]) => {
        if (!Array.isArray(filters) || filters.length === 0) {
          return false;
        }
        return Array.isArray(filters[0]?.kinds) && filters[0].kinds.includes(30911);
      });
      const filters = globalFilterCall?.[0];

      expect(filters).toBeDefined();
      expect(filters[0].kinds).toEqual([30911]);
      expect(filters[0].limit).toBe(INCIDENT_LIMITS.FETCH_LIMIT);
      expect(filters[0].since).toBeUndefined();
    });

    it('handles rapid enabled toggling', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useIncidentSubscription({
            location: [-75.1652, 39.9526],
            enabled,
          }),
        {
          initialProps: { enabled: true },
        }
      );

      rerender({ enabled: false });
      rerender({ enabled: true });
      rerender({ enabled: false });

      // Should not throw
      expect(mockNDKHooks.getNDK().subscribe).toHaveBeenCalled();
    });
  });
});
