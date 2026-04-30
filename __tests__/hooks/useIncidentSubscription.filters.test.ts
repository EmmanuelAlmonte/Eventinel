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
import { MAP_SUBSCRIPTION } from '../../lib/map/constants';
import type { MapSubscriptionViewport } from '../../lib/map/subscriptionPlanner';

function createSubscriptionViewport(zoom: number): MapSubscriptionViewport {
  return {
    center: [-75.1652, 39.9526],
    bounds: {
      ne: [-75.1552, 39.9626],
      sw: [-75.1752, 39.9426],
    },
    zoom,
  };
}

describe('useIncidentSubscription filters and options', () => {
  beforeEach(() => {
    resetIncidentSubscriptionTestHarness();
  });

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

      it('adds the newest recency window to live subscription filters', () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
          renderHook(() =>
            useIncidentSubscription({
              location: [-75.1652, 39.9526],
            })
          );

          const filters = getSubscribeCalls()[0][0];
          expect(filters[0].since).toBe(
            Math.floor(fixedNowMs / 1000) - 86400
          );
          expect(filters[0].until).toBeUndefined();
        } finally {
          nowSpy.mockRestore();
        }
      });

      it('groups desired geohash cells into fewer live relay subscriptions', () => {
        renderHook(() =>
          useIncidentSubscription({
            location: [-75.1652, 39.9526],
          })
        );

        const calls = getSubscribeCalls();
        expect(calls.length).toBeGreaterThan(1);
        for (const [filters] of calls) {
          expect(filters[0]['#g'].length).toBeLessThanOrEqual(
            MAP_SUBSCRIPTION.MAX_CELLS_PER_GROUPED_SUBSCRIPTION
          );
          expect(filters[0].limit).toBeGreaterThanOrEqual(INCIDENT_LIMITS.FETCH_LIMIT);
          expect(filters[0].limit).toBeLessThanOrEqual(
            INCIDENT_LIMITS.GROUPED_FETCH_LIMIT_MAX
          );
        }

        const requestedCellCount = new Set(
          calls.flatMap(([filters]) => filters[0]['#g'])
        ).size;
        expect(calls.length).toBeLessThan(requestedCellCount);
      });

      it('restarts live subscriptions when a focused viewport changes with the same geohash groups', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
          const { rerender } = renderHook(
            ({ viewport }) =>
              useIncidentSubscription({
                location: [-75.1652, 39.9526],
                subscriptionViewport: viewport,
              }),
            {
              initialProps: {
                viewport: createSubscriptionViewport(14),
              },
            }
          );

          const initialLiveCalls = getSubscribeCalls().filter(
            ([, options]) => options.closeOnEose === false
          );
          expect(initialLiveCalls.length).toBeGreaterThan(0);

          const initialCallCount = getSubscribeCalls().length;

          rerender({
            viewport: createSubscriptionViewport(14.3),
          });

          await waitFor(() => {
            const restartedLiveCalls = getSubscribeCalls()
              .slice(initialCallCount)
              .filter(([, options]) => options.closeOnEose === false);
            expect(restartedLiveCalls).toHaveLength(initialLiveCalls.length);
          });
        } finally {
          nowSpy.mockRestore();
        }
      });

      it('scales grouped fetch limits within a bounded cap', () => {
        renderHook(() =>
          useIncidentSubscription({
            location: [-75.1652, 39.9526],
          })
        );

        const groupedCall = getSubscribeCalls().find(
          ([filters]) => filters[0]['#g'].length > 1
        );

        expect(groupedCall).toBeDefined();
        if (!groupedCall) {
          throw new Error('Expected a grouped incident subscription call');
        }
        const filter = groupedCall[0][0];
        expect(filter.limit).toBe(
          Math.min(
            INCIDENT_LIMITS.FETCH_LIMIT * filter['#g'].length,
            INCIDENT_LIMITS.GROUPED_FETCH_LIMIT_MAX
          )
        );
      });

      it('keeps live subscription filters on the newest window when sinceDays is broader', () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
          renderHook(() =>
            useIncidentSubscription({
              location: [-75.1652, 39.9526],
              sinceDays: 3,
            })
          );

          const filters = getSubscribeCalls()[0][0];
          expect(filters[0].since).toBe(Math.floor(fixedNowMs / 1000) - 86400);
          expect(filters[0].until).toBeUndefined();
        } finally {
          nowSpy.mockRestore();
        }
      });

      it('requests older bounded backfill windows after the live window settles', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
          renderHook(() =>
            useIncidentSubscription({
              location: [-75.1652, 39.9526],
              sinceDays: 3,
            })
          );

          const liveCallCount = getSubscribeCalls().length;

          act(() => {
            mockSubscription.setEose(true);
          });

          await waitFor(() => {
            const backfillCall = getSubscribeCalls()
              .slice(liveCallCount)
              .find(([, options]) => options.closeOnEose === true);
            expect(backfillCall).toBeDefined();

            const filter = backfillCall?.[0]?.[0];
            expect(filter.since).toBe(Math.floor(fixedNowMs / 1000) - 2 * 86400);
            expect(filter.until).toBe(Math.floor(fixedNowMs / 1000) - 86400);
          });
        } finally {
          nowSpy.mockRestore();
        }
      });

      it('prunes cache-only incidents from bounded backfill windows after EOSE', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
          const backfillCacheOnlyEvent = createMockIncidentEvent({
            incidentId: 'cache-only-backfill-incident',
            title: 'Cache Only Backfill Incident',
            created_at: Math.floor(fixedNowMs / 1000) - Math.floor(1.5 * 86400),
            occurredAt: new Date(fixedNowMs - 1.5 * 86400 * 1000).toISOString(),
          });

          const { result } = renderHook(() =>
            useIncidentSubscription({
              location: [-75.1652, 39.9526],
              sinceDays: 3,
            })
          );

          const liveCalls = getSubscribeCalls().filter(
            ([, options]) => options.closeOnEose === false
          );
          expect(liveCalls.length).toBeGreaterThan(0);

          act(() => {
            for (const [, options] of liveCalls) {
              options.onEose();
            }
          });

          let backfillCall:
            | ReturnType<typeof getSubscribeCalls>[number]
            | undefined;
          await waitFor(() => {
            backfillCall = getSubscribeCalls().find(
              ([, options]) => options.closeOnEose === true
            );
            expect(backfillCall).toBeDefined();
          });

          act(() => {
            backfillCall?.[1].onEvents([backfillCacheOnlyEvent]);
            backfillCall?.[1].onEose();
          });

          await waitFor(() => {
            expect(
              result.current.incidents.some(
                (incident) =>
                  incident.incidentId === 'cache-only-backfill-incident'
              )
            ).toBe(false);
            expect(result.current.removedIncidentIds).toContain(
              'cache-only-backfill-incident'
            );
          });
          expect(mockDeleteIncidentEventsFromNdkCache).toHaveBeenCalledWith([
            expect.objectContaining({
              incidentId: 'cache-only-backfill-incident',
              eventId: backfillCacheOnlyEvent.id,
            }),
          ]);
        } finally {
          nowSpy.mockRestore();
        }
      });

      it('preserves older backfilled incidents when live subscriptions resubscribe', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
          const olderBackfilledEvent = createMockIncidentEvent({
            incidentId: 'older-backfilled-incident',
            title: 'Older Backfilled Incident',
            created_at: Math.floor(fixedNowMs / 1000) - Math.floor(1.5 * 86400),
            occurredAt: new Date(fixedNowMs - 1.5 * 86400 * 1000).toISOString(),
          });

          const { result, rerender } = renderHook(
            ({ viewport }) =>
              useIncidentSubscription({
                location: [-75.1652, 39.9526],
                subscriptionViewport: viewport,
                sinceDays: 3,
              }),
            {
              initialProps: {
                viewport: createSubscriptionViewport(14),
              },
            }
          );

          const initialLiveCalls = getSubscribeCalls().filter(
            ([, options]) => options.closeOnEose === false
          );
          expect(initialLiveCalls.length).toBeGreaterThan(0);

          act(() => {
            for (const [, options] of initialLiveCalls) {
              options.onEose();
            }
          });

          let backfillCall:
            | ReturnType<typeof getSubscribeCalls>[number]
            | undefined;
          await waitFor(() => {
            backfillCall = getSubscribeCalls().find(
              ([, options]) => options.closeOnEose === true
            );
            expect(backfillCall).toBeDefined();
          });

          act(() => {
            backfillCall?.[1].onEvent(olderBackfilledEvent);
            backfillCall?.[1].onEose();
          });

          await waitFor(() => {
            expect(result.current.incidents.map((incident) => incident.incidentId)).toContain(
              'older-backfilled-incident'
            );
          });

          const callCountBeforeRefresh = getSubscribeCalls().length;
          rerender({
            viewport: createSubscriptionViewport(14.3),
          });

          let restartedLiveCalls:
            | ReturnType<typeof getSubscribeCalls>
            | undefined;
          await waitFor(() => {
            restartedLiveCalls = getSubscribeCalls()
              .slice(callCountBeforeRefresh)
              .filter(([, options]) => options.closeOnEose === false);
            expect(restartedLiveCalls.length).toBe(initialLiveCalls.length);
          });

          act(() => {
            for (const [, options] of restartedLiveCalls ?? []) {
              options.onEose();
            }
          });

          await waitFor(() => {
            expect(result.current.incidents.map((incident) => incident.incidentId)).toContain(
              'older-backfilled-incident'
            );
          });
          expect(mockDeleteIncidentEventsFromNdkCache).not.toHaveBeenCalledWith([
            expect.objectContaining({
              incidentId: 'older-backfilled-incident',
            }),
          ]);
        } finally {
          nowSpy.mockRestore();
        }
      });

      it('does not continue backfill windows after unmount', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
          const { unmount } = renderHook(() =>
            useIncidentSubscription({
              location: [-75.1652, 39.9526],
              sinceDays: 3,
            })
          );

          const liveCalls = getSubscribeCalls().filter(
            ([, options]) => options.closeOnEose === false
          );
          expect(liveCalls.length).toBeGreaterThan(0);

          act(() => {
            for (const [, options] of liveCalls) {
              options.onEose();
            }
          });

          let backfillCall:
            | ReturnType<typeof getSubscribeCalls>[number]
            | undefined;
          await waitFor(() => {
            backfillCall = getSubscribeCalls().find(
              ([, options]) => options.closeOnEose === true
            );
            expect(backfillCall).toBeDefined();
          });

          act(() => {
            backfillCall?.[1].onEose();
          });

          const callCountBeforeUnmount = getSubscribeCalls().length;
          unmount();

          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
          });

          expect(getSubscribeCalls()).toHaveLength(callCountBeforeUnmount);
        } finally {
          nowSpy.mockRestore();
        }
      });

      it('does not request older backfill windows after the incident cap is reached', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
          const capFillEvent = createMockIncidentEvent({
            incidentId: 'recent-cap-fill',
            created_at: Math.floor(fixedNowMs / 1000),
          });

          const { result } = renderHook(() =>
            useIncidentSubscription({
              location: [-75.1652, 39.9526],
              maxIncidents: 1,
              sinceDays: 3,
            })
          );

          const liveCallCount = getSubscribeCalls().length;

          act(() => {
            mockSubscription.addEvent(capFillEvent);
            mockSubscription.setEose(true);
          });

          await waitFor(() => {
            expect(result.current.hasReceivedHistory).toBe(true);
            expect(result.current.incidents).toHaveLength(1);
          });

          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
          });

          const backfillCalls = getSubscribeCalls()
            .slice(liveCallCount)
            .filter(([, options]) => options.closeOnEose === true);
          expect(backfillCalls).toHaveLength(0);
        } finally {
          nowSpy.mockRestore();
        }
      });
    });

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

  describe('Filter Edge Cases', () => {
      it('handles location at equator/prime meridian', () => {
        renderHook(() =>
          useIncidentSubscription({
            location: [0, 0],
          })
        );

        expect(mockNDKHooks.getNDK().subscribe).toHaveBeenCalled();
      });

      it('handles location change without altering simple filter', () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
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
          expect(filters[0].limit).toBeGreaterThanOrEqual(INCIDENT_LIMITS.FETCH_LIMIT);
          expect(filters[0].limit).toBeLessThanOrEqual(
            INCIDENT_LIMITS.GROUPED_FETCH_LIMIT_MAX
          );
          expect(filters[0].since).toBe(
            Math.floor(fixedNowMs / 1000) - 86400
          );
          expect(filters[0].until).toBeUndefined();
        } finally {
          nowSpy.mockRestore();
        }
      });
    });
});
