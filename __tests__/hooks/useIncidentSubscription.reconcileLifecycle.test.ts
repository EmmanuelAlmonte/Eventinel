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
import { HISTORY_REFRESH_WATCHDOG_MS } from '../../hooks/incidentSubscription/useIncidentHistoryRefresh';

describe('useIncidentSubscription reconcile lifecycle', () => {
  beforeEach(() => {
    resetIncidentSubscriptionTestHarness();
  });

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

      it('removes cache-only incidents after live relay history completes without confirmation', async () => {
        const cacheOnlyEvent = createMockIncidentEvent({
          incidentId: 'manual-stale-cache',
          title: 'Manual Stale Cache',
        });

        mockSubscription.setEose(false);

        const { result } = renderHook(() =>
          useIncidentSubscription({
            location: [-75.1652, 39.9526],
          })
        );

        act(() => {
          mockSubscription.setEvents([cacheOnlyEvent]);
        });

        await waitFor(() => {
          expect(
            result.current.incidents.some(
              (incident) => incident.incidentId === 'manual-stale-cache'
            )
          ).toBe(true);
          expect(result.current.hasReceivedHistory).toBe(false);
        });

        act(() => {
          mockSubscription.setEose(true);
        });

        await waitFor(() => {
          expect(
            result.current.incidents.some(
              (incident) => incident.incidentId === 'manual-stale-cache'
            )
          ).toBe(false);
          expect(result.current.hasReceivedHistory).toBe(true);
          expect(result.current.removedIncidentIds).toContain('manual-stale-cache');
        });

        expect(mockDeleteIncidentEventsFromNdkCache).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              incidentId: 'manual-stale-cache',
              pubkey: cacheOnlyEvent.pubkey,
              eventId: cacheOnlyEvent.id,
            }),
          ])
        );
      });

      it('clears removed incident ids after a later history update has no removals', async () => {
        const cacheOnlyEvent = createMockIncidentEvent({
          incidentId: 'manual-stale-cache-once',
          title: 'Manual Stale Cache Once',
        });

        mockSubscription.setEose(false);

        const { result } = renderHook(() =>
          useIncidentSubscription({
            location: [-75.1652, 39.9526],
          })
        );

        act(() => {
          mockSubscription.setEvents([cacheOnlyEvent]);
        });

        await waitFor(() => {
          expect(
            result.current.incidents.some(
              (incident) => incident.incidentId === 'manual-stale-cache-once'
            )
          ).toBe(true);
        });

        act(() => {
          mockSubscription.setEose(true);
        });

        await waitFor(() => {
          expect(result.current.removedIncidentIds).toContain('manual-stale-cache-once');
        });

        act(() => {
          mockSubscription.setEose(true);
        });

        await waitFor(() => {
          expect(result.current.removedIncidentIds).toEqual([]);
        });
      });

      it('keeps relay-confirmed incidents after live relay history completes', async () => {
        const createdAt = Math.floor(Date.now() / 1000);
        const cacheEvent = createMockIncidentEvent({
          incidentId: 'relay-confirmed-cache',
          created_at: createdAt,
          title: 'Cached Copy',
        });
        const relayEvent = createMockIncidentEvent({
          incidentId: 'relay-confirmed-cache',
          created_at: createdAt + 1,
          title: 'Relay Confirmed Copy',
        });

        mockSubscription.setEose(false);

        const { result } = renderHook(() =>
          useIncidentSubscription({
            location: [-75.1652, 39.9526],
          })
        );

        act(() => {
          mockSubscription.setEvents([cacheEvent]);
          mockSubscription.addEvent(relayEvent);
          mockSubscription.setEose(true);
        });

        await waitFor(() => {
          expect(result.current.incidents).toHaveLength(1);
          expect(result.current.incidents[0].incidentId).toBe('relay-confirmed-cache');
          expect(result.current.incidents[0].title).toBe('Relay Confirmed Copy');
          expect(result.current.removedIncidentIds).not.toContain('relay-confirmed-cache');
        });
      });

      it('preserves visible incidents during map-driven replacement until new history settles', async () => {
        const phillyIncident = createMockIncidentEvent({
          incidentId: 'visible-before-pan',
          title: 'Visible Before Pan',
          tags: [['g', 'gh4075']],
        });

        mockSubscription.setEvents([]);
        mockSubscription.setEose(false);

        const { result, rerender } = renderHook(
          ({ location }) =>
            useIncidentSubscription({
              location,
            }),
          {
            initialProps: { location: [-75.1652, 39.9526] as [number, number] },
          }
        );

        act(() => {
          mockSubscription.addEvent(phillyIncident);
          mockSubscription.setEose(true);
        });

        await waitFor(() => {
          expect(result.current.hasReceivedHistory).toBe(true);
          expect(result.current.incidents.map((incident) => incident.incidentId)).toContain(
            'visible-before-pan'
          );
        });

        mockSubscription.setEvents([]);
        mockSubscription.setEose(false);
        const callCountBeforePan = getSubscribeCalls().length;

        rerender({ location: [-74.006, 40.7128] as [number, number] });

        expect(result.current.incidents.map((incident) => incident.incidentId)).toContain(
          'visible-before-pan'
        );

        const replacementCalls = getSubscribeCalls().slice(callCountBeforePan);
        act(() => {
          replacementCalls.forEach(([, options]) => {
            options?.onEose?.();
          });
        });

        await waitFor(() => {
          expect(result.current.incidents.map((incident) => incident.incidentId)).not.toContain(
            'visible-before-pan'
          );
        });
      });

      it('retries location resort while deferred map replacement history is pending', async () => {
        const fixedOccurredAt = '2026-01-01T12:00:00.000Z';
        const fixedCreatedAt = Math.floor(Date.parse(fixedOccurredAt) / 1000);
        const phillyIncident = createMockIncidentEvent({
          id: 'event-philly-preserved',
          incidentId: 'incident-philly-preserved',
          title: 'Philadelphia Preserved',
          created_at: fixedCreatedAt,
          occurredAt: fixedOccurredAt,
          lat: 39.9526,
          lng: -75.1652,
          tags: [['g', 'gh4075']],
        });
        const nycIncident = createMockIncidentEvent({
          id: 'event-nyc-preserved',
          incidentId: 'incident-nyc-preserved',
          title: 'NYC Preserved',
          created_at: fixedCreatedAt,
          occurredAt: fixedOccurredAt,
          lat: 40.7128,
          lng: -74.006,
          tags: [['g', 'gh4075']],
        });

        mockSubscription.setEvents([]);
        mockSubscription.setEose(false);

        const { result, rerender } = renderHook(
          ({ location }) =>
            useIncidentSubscription({
              location,
              sinceDays: 365,
            }),
          {
            initialProps: { location: [-75.1652, 39.9526] as [number, number] },
          }
        );

        act(() => {
          mockSubscription.addEvent(nycIncident);
          mockSubscription.addEvent(phillyIncident);
          mockSubscription.setEose(true);
        });

        await waitFor(() => {
          expect(result.current.hasReceivedHistory).toBe(true);
          expect(result.current.incidents[0].incidentId).toBe(
            'incident-philly-preserved'
          );
        });

        mockSubscription.setEvents([]);
        mockSubscription.setEose(false);

        rerender({ location: [-74.006, 40.7128] as [number, number] });

        await waitFor(() => {
          expect(result.current.hasReceivedHistory).toBe(false);
          expect(result.current.incidents.map((incident) => incident.incidentId)).toEqual([
            'incident-nyc-preserved',
            'incident-philly-preserved',
          ]);
        });
      });

      it('starts historical backfill after deferred map replacement history settles', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);
        const phillyIncident = createMockIncidentEvent({
          incidentId: 'visible-before-backfill-pan',
          title: 'Visible Before Backfill Pan',
          tags: [['g', 'gh4075']],
        });

        try {
          mockSubscription.setEvents([]);
          mockSubscription.setEose(false);

          const { result, rerender } = renderHook(
            ({ location }) =>
              useIncidentSubscription({
                location,
                sinceDays: 3,
              }),
            {
              initialProps: { location: [-75.1652, 39.9526] as [number, number] },
            }
          );

          const initialLiveCalls = getSubscribeCalls().filter(
            ([, options]) => options.closeOnEose === false
          );
          expect(initialLiveCalls.length).toBeGreaterThan(0);

          act(() => {
            mockSubscription.addEvent(phillyIncident);
            initialLiveCalls.forEach(([, options]) => {
              options.onEose();
            });
          });

          await waitFor(() => {
            expect(result.current.hasReceivedHistory).toBe(true);
            expect(result.current.incidents.map((incident) => incident.incidentId)).toContain(
              'visible-before-backfill-pan'
            );
            expect(
              getSubscribeCalls().some(([, options]) => options.closeOnEose === true)
            ).toBe(true);
          });

          mockSubscription.setEvents([]);
          mockSubscription.setEose(false);
          const callCountBeforePan = getSubscribeCalls().length;

          rerender({ location: [-74.006, 40.7128] as [number, number] });

          await waitFor(() => {
            const replacementLiveCalls = getSubscribeCalls()
              .slice(callCountBeforePan)
              .filter(([, options]) => options.closeOnEose === false);
            expect(replacementLiveCalls.length).toBeGreaterThan(0);
            expect(result.current.incidents.map((incident) => incident.incidentId)).toContain(
              'visible-before-backfill-pan'
            );
          });

          const replacementLiveCalls = getSubscribeCalls()
            .slice(callCountBeforePan)
            .filter(([, options]) => options.closeOnEose === false);

          act(() => {
            replacementLiveCalls.forEach(([, options]) => {
              options.onEose();
            });
          });

          await waitFor(() => {
            const replacementBackfillCall = getSubscribeCalls()
              .slice(callCountBeforePan)
              .find(([, options]) => options.closeOnEose === true);
            expect(replacementBackfillCall).toBeDefined();

            const filters = replacementBackfillCall?.[0] ?? [];
            expect(filters.length).toBeGreaterThan(0);
            for (const filter of filters) {
              expect(filter.since).toBe(Math.floor(fixedNowMs / 1000) - 2 * 86400);
              expect(filter.until).toBe(Math.floor(fixedNowMs / 1000) - 86400);
            }
          });
        } finally {
          nowSpy.mockRestore();
        }
      });

      it('prunes stale map incidents when replacement history never settles', async () => {
        const phillyIncident = createMockIncidentEvent({
          incidentId: 'visible-before-stalled-pan',
          title: 'Visible Before Stalled Pan',
          tags: [['g', 'gh4075']],
        });

        mockSubscription.setEvents([]);
        mockSubscription.setEose(false);

        const { result, rerender } = renderHook(
          ({ location }) =>
            useIncidentSubscription({
              location,
            }),
          {
            initialProps: { location: [-75.1652, 39.9526] as [number, number] },
          }
        );

        act(() => {
          mockSubscription.addEvent(phillyIncident);
          mockSubscription.setEose(true);
        });

        await waitFor(() => {
          expect(result.current.hasReceivedHistory).toBe(true);
          expect(result.current.incidents.map((incident) => incident.incidentId)).toContain(
            'visible-before-stalled-pan'
          );
        });

        jest.useFakeTimers();
        try {
          mockSubscription.setEvents([]);
          mockSubscription.setEose(false);

          rerender({ location: [-74.006, 40.7128] as [number, number] });

          expect(result.current.incidents.map((incident) => incident.incidentId)).toContain(
            'visible-before-stalled-pan'
          );

          await act(async () => {
            jest.advanceTimersByTime(HISTORY_REFRESH_WATCHDOG_MS);
            await Promise.resolve();
          });

          expect(result.current.incidents.map((incident) => incident.incidentId)).not.toContain(
            'visible-before-stalled-pan'
          );
          expect(result.current.removedIncidentIds).toContain(
            'visible-before-stalled-pan'
          );
        } finally {
          jest.useRealTimers();
        }
      });
    });
});
