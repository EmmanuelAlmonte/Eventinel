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
  // FILTER CONSTRUCTION TESTS
  // =============================================================================

  describe('Filter Construction', () => {
    it('subscribes when location is null (global mode)', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: null,
        })
      );

      expect(useSubscribe).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            kinds: [30911],
            limit: 200,
          }),
        ]),
        expect.any(Object)
      );
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

    it('uses simple global filter without geohash/since', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
        })
      );

      const filterCall = (useSubscribe as jest.Mock).mock.calls[0];
      const filters = filterCall[0];

      expect(filters[0].kinds).toEqual([30911]);
      expect(filters[0].limit).toBe(200);
      expect(filters[0].since).toBeUndefined();
      expect(filters[0]['#g']).toBeUndefined();
      expect(filters[0]['#t']).toBeUndefined();
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
  // SIMPLE FILTER TESTS
  // =============================================================================

  describe('Simple Filter', () => {
    it('always uses limit 200 with no since filter', () => {
      renderHook(() =>
        useIncidentSubscription({
          location: [-75.1652, 39.9526],
          maxIncidents: 9999, // Runtime cap should still be 200
        })
      );

      const filterCall = (useSubscribe as jest.Mock).mock.calls[0];
      const filters = filterCall[0];

      expect(filters[0].limit).toBe(200);
      expect(filters[0].since).toBeUndefined();
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

      const calls = (useSubscribe as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      const filters = lastCall?.[0];
      expect(filters[0].kinds).toEqual([30911]);
      expect(filters[0].limit).toBe(200);
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
      expect(useSubscribe).toHaveBeenCalled();
    });
  });
});
