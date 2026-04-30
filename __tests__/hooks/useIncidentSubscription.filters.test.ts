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

      it('adds the default freshness window to live subscription filters', () => {
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
            Math.floor(fixedNowMs / 1000) - INCIDENT_LIMITS.SINCE_DAYS * 86400
          );
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
        }

        const requestedCellCount = new Set(
          calls.flatMap(([filters]) => filters[0]['#g'])
        ).size;
        expect(calls.length).toBeLessThan(requestedCellCount);
      });

      it('uses a custom sinceDays override when provided', () => {
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
          expect(filters[0].since).toBe(Math.floor(fixedNowMs / 1000) - 3 * 86400);
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
          expect(filters[0].limit).toBe(INCIDENT_LIMITS.FETCH_LIMIT);
          expect(filters[0].since).toBe(
            Math.floor(fixedNowMs / 1000) - INCIDENT_LIMITS.SINCE_DAYS * 86400
          );
        } finally {
          nowSpy.mockRestore();
        }
      });
    });
});
