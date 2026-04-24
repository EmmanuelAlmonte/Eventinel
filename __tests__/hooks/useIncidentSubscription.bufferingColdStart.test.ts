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

describe('useIncidentSubscription buffering and cold start', () => {
  beforeEach(() => {
    resetIncidentSubscriptionTestHarness();
  });

  describe('Buffering and Cold Start', () => {
      it('preserves buffered live incidents when sinceDays changes before flush', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);
  
        try {
          const bufferedEvent = createMockIncidentEvent({
            incidentId: 'buffered-live',
            title: 'Buffered Live',
            created_at: Math.floor(fixedNowMs / 1000) - 3600,
          });
  
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
  
          mockSubscription.addEvent(bufferedEvent);
          mockSubscription.setEvents([]);
          rerender({ sinceDays: 1 });
  
          await waitFor(() => {
            expect(
              result.current.incidents.some(
                (incident) => incident.incidentId === 'buffered-live'
              )
            ).toBe(true);
          });
        } finally {
          nowSpy.mockRestore();
        }
      });
  
      it('buffers relay-driven cold-start events before publishing them to consumers', async () => {
        jest.useFakeTimers();
  
        try {
          mockSubscription.setEvents([]);
          mockSubscription.setEose(false);
  
          const relayEvent = createMockIncidentEvent({
            incidentId: 'cold-start-relay',
            title: 'Cold Start Relay Event',
          });
  
          const { result } = renderHook(() =>
            useIncidentSubscription({
              location: [-75.1652, 39.9526],
            })
          );
  
          await act(async () => {
            await Promise.resolve();
          });
          expect(getSubscribeCalls().length).toBeGreaterThan(0);
  
          act(() => {
            mockSubscription.addEvent(relayEvent);
          });
  
          expect(result.current.incidents).toEqual([]);
  
          await act(async () => {
            jest.advanceTimersByTime(INITIAL_HISTORY_RELAY_BUFFER_MS - 1);
            await Promise.resolve();
          });
  
          expect(result.current.incidents).toEqual([]);
  
          await act(async () => {
            jest.advanceTimersByTime(1);
            await Promise.resolve();
          });
  
          expect(result.current.incidents.map((incident) => incident.incidentId)).toEqual([
            'cold-start-relay',
          ]);
        } finally {
          jest.useRealTimers();
        }
      });
  
      it('keeps cache-first cold-start flush responsive when relay events arrive before the cache timer fires', async () => {
        jest.useFakeTimers();
  
        try {
          const cacheEvent = createMockIncidentEvent({
            incidentId: 'cold-start-cache-first',
            title: 'Cold Start Cache Event',
          });
          const relayEvent = createMockIncidentEvent({
            incidentId: 'cold-start-relay-before-cache-flush',
            title: 'Cold Start Relay Event',
          });
  
          mockSubscription.setEvents([cacheEvent]);
          mockSubscription.setEose(false);
  
          const { result } = renderHook(() =>
            useIncidentSubscription({
              location: [-75.1652, 39.9526],
            })
          );
  
          await act(async () => {
            await Promise.resolve();
          });
          expect(getSubscribeCalls().length).toBeGreaterThan(0);
  
          act(() => {
            mockSubscription.addEvent(relayEvent);
          });
  
          await act(async () => {
            jest.advanceTimersByTime(SUBSCRIPTION_BUFFER_MS);
            await Promise.resolve();
          });
  
          expect(result.current.incidents.map((incident) => incident.incidentId).sort()).toEqual([
            'cold-start-cache-first',
            'cold-start-relay-before-cache-flush',
          ]);
        } finally {
          jest.useRealTimers();
        }
      });
  
      it('flushes buffered relay cold-start events immediately when EOSE arrives', async () => {
        jest.useFakeTimers();
  
        try {
          mockSubscription.setEvents([]);
          mockSubscription.setEose(false);
  
          const relayEvent = createMockIncidentEvent({
            incidentId: 'cold-start-eose',
            title: 'Cold Start EOSE Event',
          });
  
          const { result } = renderHook(() =>
            useIncidentSubscription({
              location: [-75.1652, 39.9526],
            })
          );
  
          act(() => {
            mockSubscription.addEvent(relayEvent);
          });
  
          expect(result.current.incidents).toEqual([]);
  
          await act(async () => {
            mockSubscription.setEose(true);
            await Promise.resolve();
          });
  
          expect(result.current.incidents.map((incident) => incident.incidentId)).toEqual([
            'cold-start-eose',
          ]);
          expect(result.current.hasReceivedHistory).toBe(true);
        } finally {
          jest.useRealTimers();
        }
      });
    });
});

