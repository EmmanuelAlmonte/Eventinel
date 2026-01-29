/**
 * useIncidentSubscription Hook Tests
 *
 * Tests the incident subscription hook including:
 * - Geohash calculation from location
 * - NDK filter construction
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
  useSubscribe,
  NDKEvent,
} from '../../__mocks__/@nostr-dev-kit/mobile';

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
          lat: content.lat || 0,
          lng: content.lng || 0,
          address: content.address || '',
          geohash: 'gh4075',
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
}));

// Import the hook after mocks
import { useIncidentSubscription } from '../../hooks/useIncidentSubscription';

// =============================================================================
// HELPERS
// =============================================================================

function createMockIncidentEvent(overrides: Partial<any> = {}) {
  const id = overrides.id || 'event_' + Math.random().toString(36).slice(2);
  const incidentId = overrides.incidentId || 'incident_' + Math.random().toString(36).slice(2);
  const severity = overrides.severity || 3;
  const createdAt = overrides.created_at || Math.floor(Date.now() / 1000);
  const occurredAt = overrides.occurredAt || new Date().toISOString();

  return {
    id,
    pubkey: overrides.pubkey || 'mock_pubkey',
    kind: 30911,
    created_at: createdAt,
    tags: [
      ['d', incidentId],
      ['severity', String(severity)],
      ['g', 'gh4075'],
      ['t', 'incident'],
      ...(overrides.tags || []),
    ],
    content: JSON.stringify({
      title: overrides.title || 'Test Incident',
      description: overrides.description || 'Test description',
      lat: overrides.lat || 39.9526,
      lng: overrides.lng || -75.1652,
      type: overrides.type || 'fire',
      severity,
      occurredAt,
      source: overrides.source || 'community',
      sourceId: overrides.sourceId || 'test-123',
    }),
  };
}

// =============================================================================
// TEST SETUP
// =============================================================================

describe('useIncidentSubscription', () => {
  beforeEach(() => {
    mockSubscription.reset();
    jest.clearAllMocks();
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
  // LOCATION / GEOHASH TESTS
  // =============================================================================

  describe('Location and Geohash', () => {
    it('does not subscribe when location is null', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: null,
        })
      );

      // useSubscribe should be called with false (disabled)
      expect(useSubscribe).toHaveBeenCalledWith(false, expect.any(Object));
    });

    it('subscribes when location is provided', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      // useSubscribe should be called with filters array
      expect(useSubscribe).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            kinds: [30911],
          }),
        ]),
        expect.any(Object)
      );
    });

    it('includes geohash and neighbors in filter', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      const filterCall = (useSubscribe as jest.Mock).mock.calls[0];
      const filters = filterCall[0];

      // Should have #g tag with geohashes
      expect(filters[0]['#g']).toBeDefined();
      expect(filters[0]['#g'].length).toBeGreaterThan(1); // Main hash + neighbors
    });

    it('includes incident tag filter', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      const filterCall = (useSubscribe as jest.Mock).mock.calls[0];
      const filters = filterCall[0];

      expect(filters[0]['#t']).toContain('incident');
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

      expect(useSubscribe).toHaveBeenCalledWith(false, expect.any(Object));
    });

    it('subscribes when enabled is true (default)', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
          enabled: true,
        })
      );

      expect(useSubscribe).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Object)
      );
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
      const incidentId = 'duplicate-incident';
      const event1 = createMockIncidentEvent({
        incidentId,
        created_at: 1000,
        title: 'First Version',
      });
      const event2 = createMockIncidentEvent({
        incidentId,
        created_at: 2000,
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
      const incidentId = 'duplicate-incident';
      const event1 = createMockIncidentEvent({
        incidentId,
        created_at: 1000,
        title: 'Old Version',
      });
      const event2 = createMockIncidentEvent({
        incidentId,
        created_at: 2000,
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
      const incidentId = 'duplicate-incident';
      // Newer event comes first in array
      const newerEvent = createMockIncidentEvent({
        incidentId,
        created_at: 2000,
        title: 'Newer',
      });
      const olderEvent = createMockIncidentEvent({
        incidentId,
        created_at: 1000,
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
    it('sorts incidents by occurredAt descending (newest first)', async () => {
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

      const { result, rerender } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      expect(result.current.isInitialLoading).toBe(true);

      mockSubscription.setEose(true);
      rerender();

      await waitFor(() => {
        expect(result.current.isInitialLoading).toBe(false);
      });
    });

    it('sets hasReceivedHistory to true after EOSE', async () => {
      mockSubscription.setEose(false);

      const { result, rerender } = renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      expect(result.current.hasReceivedHistory).toBe(false);

      mockSubscription.setEose(true);
      rerender();

      await waitFor(() => {
        expect(result.current.hasReceivedHistory).toBe(true);
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

      await waitFor(() => {
        expect(result.current.totalEventsReceived).toBe(2);
        expect(result.current.incidents.length).toBe(1);
      });
    });
  });

  // =============================================================================
  // SINCE DAYS FILTER TESTS
  // =============================================================================

  describe('Since Days Filter', () => {
    it('includes since timestamp in filter', () => {
      const sinceDays = 7;
      const expectedSince = Math.floor(Date.now() / 1000) - sinceDays * 86400;

      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
          sinceDays,
        })
      );

      const filterCall = (useSubscribe as jest.Mock).mock.calls[0];
      const filters = filterCall[0];

      // Should have since timestamp close to expected (within 10 seconds)
      expect(filters[0].since).toBeGreaterThan(expectedSince - 10);
      expect(filters[0].since).toBeLessThan(expectedSince + 10);
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

      const filterCall = (useSubscribe as jest.Mock).mock.calls[0];
      const options = filterCall[1];

      expect(options.cacheUsage).toBe('CACHE_FIRST');
    });

    it('sets closeOnEose to false for live updates', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      const filterCall = (useSubscribe as jest.Mock).mock.calls[0];
      const options = filterCall[1];

      expect(options.closeOnEose).toBe(false);
    });

    it('sets groupable to false to avoid race conditions', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      const filterCall = (useSubscribe as jest.Mock).mock.calls[0];
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

      // Should not throw and should call useSubscribe with valid filters
      expect(useSubscribe).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('handles location change by updating filters', () => {
      const { rerender } = renderHook(
        ({ location }) =>
          useIncidentSubscription({
            location,
          }),
        {
          initialProps: { location: [-75.1652, 39.9526] as [number, number] },
        }
      );

      const firstCall = (useSubscribe as jest.Mock).mock.calls.length;

      rerender({ location: [-74.006, 40.7128] as [number, number] });

      // useSubscribe should be called again with new filters
      expect((useSubscribe as jest.Mock).mock.calls.length).toBeGreaterThan(
        firstCall
      );
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
      expect(useSubscribe).toHaveBeenCalled();
    });
  });
});
