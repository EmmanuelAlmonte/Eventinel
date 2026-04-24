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

describe('useIncidentSubscription dedupe and sorting', () => {
  beforeEach(() => {
    resetIncidentSubscriptionTestHarness();
  });

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
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);
        const fixedOccurredAt = new Date(fixedNowMs - 3600 * 1000).toISOString();
        const fixedCreatedAt = Math.floor((fixedNowMs - 3600 * 1000) / 1000);
  
        try {
          const incidentB = createMockIncidentEvent({
            id: 'event-b',
            incidentId: 'incident-b',
            title: 'Incident B',
            created_at: fixedCreatedAt,
            occurredAt: fixedOccurredAt,
            lat: 39.9526,
            lng: -75.1652,
          });
          const incidentA = createMockIncidentEvent({
            id: 'event-a',
            incidentId: 'incident-a',
            title: 'Incident A',
            created_at: fixedCreatedAt,
            occurredAt: fixedOccurredAt,
            lat: 39.9526,
            lng: -75.1652,
          });
  
          mockSubscription.setEvents([incidentB, incidentA]);
          mockSubscription.setEose(true);
  
          const { result } = renderHook(() =>
            useIncidentSubscription({
              location: [-75.1652, 39.9526],
              sinceDays: 30,
            })
          );
  
          await waitFor(() => {
            expect(result.current.incidents.length).toBe(2);
            expect(result.current.incidents[0].incidentId).toBe('incident-a');
            expect(result.current.incidents[1].incidentId).toBe('incident-b');
          });
        } finally {
          nowSpy.mockRestore();
        }
      });
  
      it('re-sorts existing incidents when location changes', async () => {
        const fixedOccurredAt = '2026-01-01T12:00:00.000Z';
        const fixedCreatedAt = Math.floor(Date.parse(fixedOccurredAt) / 1000);
  
        const phillyIncident = createMockIncidentEvent({
          id: 'event-philly',
          incidentId: 'incident-philly',
          title: 'Philadelphia Incident',
          created_at: fixedCreatedAt,
          occurredAt: fixedOccurredAt,
          lat: 39.9526,
          lng: -75.1652,
        });
        const nycIncident = createMockIncidentEvent({
          id: 'event-nyc',
          incidentId: 'incident-nyc',
          title: 'NYC Incident',
          created_at: fixedCreatedAt,
          occurredAt: fixedOccurredAt,
          lat: 40.7128,
          lng: -74.006,
        });
  
        mockSubscription.setEvents([phillyIncident, nycIncident]);
        mockSubscription.setEose(true);
  
        const { result, rerender } = renderHook(
          (props: UseIncidentSubscriptionOptions) => useIncidentSubscription(props),
          {
            initialProps: {
              location: [-75.1652, 39.9526],
              subscriptionLocation: [-75.1652, 39.9526],
              sinceDays: 365,
            },
          }
        );
  
        await waitFor(() => {
          expect(result.current.incidents[0].incidentId).toBe('incident-philly');
        });
  
        rerender({
          location: [-74.006, 40.7128],
          subscriptionLocation: [-75.1652, 39.9526],
          sinceDays: 365,
        });
  
        await waitFor(() => {
          expect(result.current.incidents[0].incidentId).toBe('incident-nyc');
        });
      });
    });
});

