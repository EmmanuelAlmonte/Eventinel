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

describe('useIncidentSubscription history refresh', () => {
  beforeEach(() => {
    resetIncidentSubscriptionTestHarness();
  });

  describe('History Refresh', () => {
      it('restarts live subscriptions when sinceDays changes', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
          const { rerender } = renderHook(
            ({ sinceDays }) =>
              useIncidentSubscription({
                location: [-75.1652, 39.9526],
                sinceDays,
              }),
            {
              initialProps: { sinceDays: 30 },
            }
          );

          const initialCallCount = getSubscribeCalls().length;

          rerender({ sinceDays: 1 });

          await waitFor(() => {
            expect(getSubscribeCalls().length).toBeGreaterThan(initialCallCount);
          });

          const latestFilters = getSubscribeCalls()[getSubscribeCalls().length - 1][0];
          expect(latestFilters[0].since).toBe(
            Math.floor(fixedNowMs / 1000) - 86400
          );
        } finally {
          nowSpy.mockRestore();
        }
      });

      it('keeps initial history incomplete when cached events arrive before EOSE', async () => {
        const cachedEvent = createMockIncidentEvent({
          incidentId: 'initial-cache-only',
          title: 'Initial Cache Only',
        });

        mockSubscription.setEvents([cachedEvent]);
        mockSubscription.setEose(false);

        const { result } = renderHook(() =>
          useIncidentSubscription({
            location: [-75.1652, 39.9526],
          })
        );

        await waitFor(() => {
          expect(
            result.current.incidents.some(
              (incident) => incident.incidentId === 'initial-cache-only'
            )
          ).toBe(true);
        });

        expect(result.current.hasReceivedHistory).toBe(false);
      });

      it('completes a history refresh when current-epoch cache callbacks deliver data without EOSE', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
          const seededEvent = createMockIncidentEvent({
            incidentId: 'seeded-history',
            title: 'Seeded History',
            created_at: Math.floor(fixedNowMs / 1000) - 3600,
            occurredAt: new Date(fixedNowMs - 3600 * 1000).toISOString(),
          });
          const refreshedCacheEvent = createMockIncidentEvent({
            incidentId: 'refresh-cache-hit',
            title: 'Refresh Cache Hit',
            created_at: Math.floor(fixedNowMs / 1000) - 1800,
            occurredAt: new Date(fixedNowMs - 1800 * 1000).toISOString(),
          });

          mockSubscription.setEvents([seededEvent]);
          mockSubscription.setEose(true);

          const { result, rerender } = renderHook(
            ({ sinceDays }) =>
              useIncidentSubscription({
                location: [-75.1652, 39.9526],
                sinceDays,
              }),
            {
              initialProps: { sinceDays: 30 },
            }
          );

          await waitFor(() => {
            expect(result.current.hasReceivedHistory).toBe(true);
          });

          mockSubscription.setEvents([]);
          mockSubscription.setEose(false);
          const callCountBeforeRefresh = getSubscribeCalls().length;

          rerender({ sinceDays: 1 });

          const refreshCalls = getSubscribeCalls().slice(callCountBeforeRefresh);
          act(() => {
            refreshCalls.forEach(([, options]) => {
              options?.onEvents?.([refreshedCacheEvent]);
            });
          });

          await waitFor(() => {
            expect(result.current.hasReceivedHistory).toBe(true);
            expect(
              result.current.incidents.some(
                (incident) => incident.incidentId === 'refresh-cache-hit'
              )
            ).toBe(true);
          });
        } finally {
          nowSpy.mockRestore();
        }
      });

      it('ignores stale completion callbacks from an older history refresh when sinceDays is changed rapidly', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
          const seededEvent = createMockIncidentEvent({
            incidentId: 'seeded-visible',
            title: 'Seeded Visible',
            created_at: Math.floor(fixedNowMs / 1000) - 3600,
            occurredAt: new Date(fixedNowMs - 3600 * 1000).toISOString(),
          });

          mockSubscription.setEvents([seededEvent]);
          mockSubscription.setEose(true);

          const { result, rerender } = renderHook(
            ({ sinceDays }) =>
              useIncidentSubscription({
                location: [-75.1652, 39.9526],
                sinceDays,
              }),
            {
              initialProps: { sinceDays: 30 },
            }
          );

          await waitFor(() => {
            expect(result.current.hasReceivedHistory).toBe(true);
          });

          mockSubscription.setEvents([]);
          mockSubscription.setEose(false);

          const callCountBeforeFirstRefresh = getSubscribeCalls().length;
          rerender({ sinceDays: 7 });
          const firstRefreshCalls = getSubscribeCalls().slice(callCountBeforeFirstRefresh);

          const callCountBeforeSecondRefresh = getSubscribeCalls().length;
          rerender({ sinceDays: 30 });
          const secondRefreshCalls = getSubscribeCalls().slice(callCountBeforeSecondRefresh);

          act(() => {
            firstRefreshCalls.forEach(([, options]) => {
              options?.onEose?.();
            });
          });

          expect(result.current.hasReceivedHistory).toBe(false);

          act(() => {
            secondRefreshCalls.forEach(([, options]) => {
              options?.onEose?.();
            });
          });

          await waitFor(() => {
            expect(result.current.hasReceivedHistory).toBe(true);
          });
        } finally {
          nowSpy.mockRestore();
        }
      });

      it('lets subscriptions added after a history refresh starts complete through normal EOSE handling', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
          const seededEvent = createMockIncidentEvent({
            incidentId: 'seeded-visible',
            title: 'Seeded Visible',
            created_at: Math.floor(fixedNowMs / 1000) - 3600,
            occurredAt: new Date(fixedNowMs - 3600 * 1000).toISOString(),
          });

          mockSubscription.setEvents([seededEvent]);
          mockSubscription.setEose(true);

          const { result, rerender } = renderHook(
            (props: UseIncidentSubscriptionOptions) => useIncidentSubscription(props),
            {
              initialProps: {
                location: [-75.1652, 39.9526],
                sinceDays: 30,
              },
            }
          );

          await waitFor(() => {
            expect(result.current.hasReceivedHistory).toBe(true);
          });

          mockSubscription.setEvents([]);
          mockSubscription.setEose(false);

          const callCountBeforeRefresh = getSubscribeCalls().length;
          rerender({
            location: [-75.1652, 39.9526],
            sinceDays: 7,
          });
          const refreshCalls = getSubscribeCalls().slice(callCountBeforeRefresh);

          const callCountBeforeMove = getSubscribeCalls().length;
          rerender({
            location: [-74.006, 40.7128],
            sinceDays: 7,
          });
          const movedCalls = getSubscribeCalls().slice(callCountBeforeMove);

          act(() => {
            movedCalls.forEach(([, options]) => {
              options?.onEose?.();
            });
          });

          expect(result.current.hasReceivedHistory).toBe(false);

          act(() => {
            refreshCalls.forEach(([, options]) => {
              options?.onEose?.();
            });
          });

          await waitFor(() => {
            expect(result.current.hasReceivedHistory).toBe(true);
          });
        } finally {
          nowSpy.mockRestore();
        }
      });

      it('does not resurrect removed refresh keys as history-ready after watchdog completion', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

        try {
          const seededEvent = createMockIncidentEvent({
            incidentId: 'seeded-visible',
            title: 'Seeded Visible',
            created_at: Math.floor(fixedNowMs / 1000) - 3600,
            occurredAt: new Date(fixedNowMs - 3600 * 1000).toISOString(),
          });

          mockSubscription.setEvents([seededEvent]);
          mockSubscription.setEose(true);

          const { result, rerender } = renderHook(
            (props: UseIncidentSubscriptionOptions) => useIncidentSubscription(props),
            {
              initialProps: {
                location: [-75.1652, 39.9526],
                sinceDays: 30,
              },
            }
          );

          await waitFor(() => {
            expect(result.current.hasReceivedHistory).toBe(true);
          });

          mockSubscription.setEvents([]);
          mockSubscription.setEose(false);

          rerender({
            location: [-75.1652, 39.9526],
            sinceDays: 7,
          });

          const callCountBeforeMove = getSubscribeCalls().length;
          rerender({
            location: [-74.006, 40.7128],
            sinceDays: 7,
          });
          const movedCalls = getSubscribeCalls().slice(callCountBeforeMove);

          act(() => {
            movedCalls.forEach(([, options]) => {
              options?.onEose?.();
            });
          });

          expect(result.current.hasReceivedHistory).toBe(false);

          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 6100));
          });

          await waitFor(() => {
            expect(result.current.hasReceivedHistory).toBe(true);
          });

          rerender({
            location: [-75.1652, 39.9526],
            sinceDays: 7,
          });

          expect(result.current.hasReceivedHistory).toBe(false);
        } finally {
          nowSpy.mockRestore();
        }
      });
    });
});
