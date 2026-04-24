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

describe('useIncidentSubscription stale pruning', () => {
  beforeEach(() => {
    resetIncidentSubscriptionTestHarness();
  });

  describe('Stale Pruning', () => {
      it('drops buffered incidents older than the narrowed sinceDays before flush', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);
  
        try {
          const bufferedEvent = createMockIncidentEvent({
            incidentId: 'stale-buffered',
            title: 'Stale Buffered',
            created_at: Math.floor(fixedNowMs / 1000) - 5 * 86400,
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
  
          const initialCallCount = getSubscribeCalls().length;
  
          mockSubscription.addEvent(bufferedEvent);
          mockSubscription.setEvents([]);
          rerender({ sinceDays: 1 });
  
          await waitFor(() => {
            expect(getSubscribeCalls().length).toBeGreaterThan(initialCallCount);
          });
  
          expect(
            result.current.incidents.some(
              (incident) => incident.incidentId === 'stale-buffered'
            )
          ).toBe(false);
          expect(result.current.totalEventsReceived).toBe(0);
        } finally {
          nowSpy.mockRestore();
        }
      });
  
      it('drops stale cache replayed incidents when sinceDays narrows and subscriptions restart', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);
  
        try {
          const staleEvent = createMockIncidentEvent({
            incidentId: 'stale-cache-replay',
            title: 'Stale Cache Replay',
            created_at: Math.floor(fixedNowMs / 1000) - 5 * 86400,
            occurredAt: new Date(fixedNowMs - 5 * 86400 * 1000).toISOString(),
          });
  
          mockSubscription.setEvents([staleEvent]);
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
            expect(
              result.current.incidents.some(
                (incident) => incident.incidentId === 'stale-cache-replay'
              )
            ).toBe(true);
          });
  
          rerender({ sinceDays: 1 });
  
          await waitFor(() => {
            expect(
              result.current.incidents.some(
                (incident) => incident.incidentId === 'stale-cache-replay'
              )
            ).toBe(false);
          });
  
          expect(result.current.totalEventsReceived).toBe(0);
        } finally {
          nowSpy.mockRestore();
        }
      });
  
      it('preserves already-visible in-window incidents when sinceDays changes and replay does not re-emit them', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);
  
        try {
          const freshVisibleEvent = createMockIncidentEvent({
            incidentId: 'fresh-visible-incident',
            title: 'Fresh Visible Incident',
            created_at: Math.floor(fixedNowMs / 1000) - 3600,
            occurredAt: new Date(fixedNowMs - 3600 * 1000).toISOString(),
          });
  
          mockSubscription.setEvents([freshVisibleEvent]);
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
            expect(result.current.incidents.map((incident) => incident.incidentId)).toEqual([
              'fresh-visible-incident',
            ]);
          });
  
          mockSubscription.setEvents([]);
          mockSubscription.setEose(false);
          rerender({ sinceDays: 1 });
  
          await waitFor(() => {
            expect(result.current.incidents.map((incident) => incident.incidentId)).toEqual([
              'fresh-visible-incident',
            ]);
            expect(result.current.hasReceivedHistory).toBe(false);
          });
        } finally {
          nowSpy.mockRestore();
        }
      });
  
      it('removes already-visible incidents that are outside the narrowed window even when replay does not re-emit them', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);
  
        try {
          const staleVisibleEvent = createMockIncidentEvent({
            incidentId: 'stale-visible-incident',
            title: 'Stale Visible Incident',
            created_at: Math.floor(fixedNowMs / 1000) - 5 * 86400,
            occurredAt: new Date(fixedNowMs - 5 * 86400 * 1000).toISOString(),
          });
  
          mockSubscription.setEvents([staleVisibleEvent]);
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
            expect(result.current.incidents.map((incident) => incident.incidentId)).toEqual([
              'stale-visible-incident',
            ]);
          });
  
          mockSubscription.setEvents([]);
          mockSubscription.setEose(false);
          rerender({ sinceDays: 1 });
  
          await waitFor(() => {
            expect(result.current.incidents).toEqual([]);
            expect(result.current.hasReceivedHistory).toBe(false);
          });
        } finally {
          nowSpy.mockRestore();
        }
      });
  
      it('preserves only the already-visible incidents that remain in-window across a sinceDays change without replay', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);
  
        try {
          const staleVisibleEvent = createMockIncidentEvent({
            incidentId: 'mixed-stale-visible',
            title: 'Mixed Stale Visible',
            created_at: Math.floor(fixedNowMs / 1000) - 5 * 86400,
            occurredAt: new Date(fixedNowMs - 5 * 86400 * 1000).toISOString(),
          });
          const freshVisibleEvent = createMockIncidentEvent({
            incidentId: 'mixed-fresh-visible',
            title: 'Mixed Fresh Visible',
            created_at: Math.floor(fixedNowMs / 1000) - 2 * 3600,
            occurredAt: new Date(fixedNowMs - 2 * 3600 * 1000).toISOString(),
          });
  
          mockSubscription.setEvents([staleVisibleEvent, freshVisibleEvent]);
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
            expect(result.current.incidents.map((incident) => incident.incidentId)).toEqual([
              'mixed-fresh-visible',
              'mixed-stale-visible',
            ]);
          });
  
          mockSubscription.setEvents([]);
          mockSubscription.setEose(false);
          rerender({ sinceDays: 1 });
  
          await waitFor(() => {
            expect(result.current.incidents.map((incident) => incident.incidentId)).toEqual([
              'mixed-fresh-visible',
            ]);
            expect(result.current.hasReceivedHistory).toBe(false);
          });
        } finally {
          nowSpy.mockRestore();
        }
      });
  
      it('keeps only in-window replayed incidents visible when sinceDays narrows', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);
  
        try {
          const staleEvent = createMockIncidentEvent({
            incidentId: 'stale-cache-replay',
            title: 'Stale Cache Replay',
            created_at: Math.floor(fixedNowMs / 1000) - 5 * 86400,
            occurredAt: new Date(fixedNowMs - 5 * 86400 * 1000).toISOString(),
          });
          const freshEvent = createMockIncidentEvent({
            incidentId: 'fresh-cache-replay',
            title: 'Fresh Cache Replay',
            created_at: Math.floor(fixedNowMs / 1000) - 3600,
            occurredAt: new Date(fixedNowMs - 3600 * 1000).toISOString(),
          });
  
          mockSubscription.setEvents([staleEvent, freshEvent]);
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
            expect(result.current.incidents.length).toBe(2);
          });
  
          rerender({ sinceDays: 1 });
  
          await waitFor(() => {
            expect(result.current.incidents.map((incident) => incident.incidentId)).toEqual([
              'fresh-cache-replay',
            ]);
          });
  
        } finally {
          nowSpy.mockRestore();
        }
      });
  
      it('drops replayed incidents whose occurrence is older than the narrowed window even when created_at is recent', async () => {
        const fixedNowMs = 1_735_689_600_000;
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);
  
        try {
          const recentlyReportedOldIncident = createMockIncidentEvent({
            incidentId: 'recently-reported-old-incident',
            title: 'Recently Reported Old Incident',
            created_at: Math.floor(fixedNowMs / 1000) - 3600,
            occurredAt: new Date(fixedNowMs - 5 * 86400 * 1000).toISOString(),
          });
          const freshIncident = createMockIncidentEvent({
            incidentId: 'fresh-occurrence-incident',
            title: 'Fresh Occurrence Incident',
            created_at: Math.floor(fixedNowMs / 1000) - 1800,
            occurredAt: new Date(fixedNowMs - 1800 * 1000).toISOString(),
          });
  
          mockSubscription.setEvents([recentlyReportedOldIncident, freshIncident]);
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
            expect(
              result.current.incidents.map((incident) => incident.incidentId)
            ).toContain('recently-reported-old-incident');
          });
  
          rerender({ sinceDays: 1 });
  
          await waitFor(() => {
            expect(result.current.incidents.map((incident) => incident.incidentId)).toEqual([
              'fresh-occurrence-incident',
            ]);
          });
        } finally {
          nowSpy.mockRestore();
        }
      });
    });
});

