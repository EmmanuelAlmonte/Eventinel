/**
 * @jest-environment jsdom
 */

import {
  act,
  createMockIncidentEvent,
  getSubscribeCalls,
  INCIDENT_LIMITS,
  INITIAL_HISTORY_RELAY_BUFFER_MS,
  mockDeleteIncidentEventsFromNdkCache,
  mockNDKHooks,
  mockSubscription,
  renderHook,
  resetIncidentSubscriptionTestHarness,
  SUBSCRIPTION_BUFFER_MS,
  useIncidentSubscription,
  waitFor,
} from './incidentSubscription/useIncidentSubscriptionTestHarness';
import type { UseIncidentSubscriptionOptions } from '../../hooks/useIncidentSubscription';

describe('useIncidentSubscription parsed data and counts', () => {
  beforeEach(() => {
    resetIncidentSubscriptionTestHarness();
  });

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
});

