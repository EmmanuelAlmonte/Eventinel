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

describe('useIncidentSubscription lifecycle', () => {
  beforeEach(() => {
    resetIncidentSubscriptionTestHarness();
  });

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

      it('clears incidents when runtime permission loss removes location', async () => {
        const mockEvent = createMockIncidentEvent({
          title: 'Clear After Permission Loss',
          severity: 4,
        });
        mockSubscription.setEvents([mockEvent]);
        mockSubscription.setEose(true);

        const { result, rerender } = renderHook(
          (props: UseIncidentSubscriptionOptions) => useIncidentSubscription(props),
          {
            initialProps: {
              location: [-75.1652, 39.9526],
              enabled: true,
            },
          }
        );

        await waitFor(() => {
          expect(result.current.incidents.length).toBe(1);
        });

        rerender({
          location: null,
          enabled: false,
        });

        expect(result.current.incidents).toEqual([]);
        expect(result.current.totalEventsReceived).toBe(0);
        expect(result.current.hasReceivedHistory).toBe(false);
        expect(result.current.isInitialLoading).toBe(false);
      });
    });

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

      it('keeps history complete when sinceDays changes with no desired cells', () => {
        const { result, rerender } = renderHook(
          ({ sinceDays }) =>
            useIncidentSubscription({
              location: null,
              sinceDays,
            }),
          {
            initialProps: { sinceDays: 30 },
          }
        );

        expect(result.current.hasReceivedHistory).toBe(true);
        expect(result.current.isInitialLoading).toBe(false);

        rerender({ sinceDays: 1 });

        expect(result.current.hasReceivedHistory).toBe(true);
        expect(result.current.isInitialLoading).toBe(false);
        expect(getSubscribeCalls().length).toBe(0);
      });
    });

  describe('Lifecycle Edge Cases', () => {
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
