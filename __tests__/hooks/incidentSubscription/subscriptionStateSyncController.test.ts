/**
 * Subscription state sync controller tests
 *
 * Covers raw-event intake guards and bounded pending queue behavior before
 * reducer parsing/storage work begins.
 *
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react-native';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { NDKEvent } from '@nostr-dev-kit/mobile';

import { INCIDENT_LIMITS } from '../../../lib/map/constants';
import { calculateIncidentSinceUnixSeconds } from '../../../lib/incidentHistoryWindow';
import {
  getIncidentIntakeMetrics,
  resetIncidentIntakeMetrics,
  useIncidentSubscriptionStateSyncController,
} from '../../../hooks/incidentSubscription/subscriptionStateSyncController';
import type {
  IncidentSubscriptionDisplayState,
  ProcessedIncident,
  QueuedEvent,
} from '../../../hooks/incidentSubscription/types';

function createMutableRef<T>(value: T): MutableRefObject<T> {
  return { current: value };
}

function createEvent(
  incidentId: string,
  createdAt: number,
  overrides: Partial<{
    eventId: string;
    content: string;
    tags: string[][];
    kind: number;
  }> = {}
): NDKEvent {
  return {
    id: overrides.eventId ?? `event-${incidentId}-${createdAt}`,
    kind: overrides.kind ?? 30911,
    created_at: createdAt,
    content: overrides.content ?? '{"title":"Test","description":"ok"}',
    tags: overrides.tags ?? [['d', incidentId]],
  } as unknown as NDKEvent;
}

function createHookArgs() {
  const incidentMapRef = createMutableRef<Map<string, ProcessedIncident>>(new Map());
  const pendingEventsRef = createMutableRef<QueuedEvent[]>([]);
  const flushTimerRef = createMutableRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdatedRef = createMutableRef<number | null>(null);
  const lastTotalEventsRef = createMutableRef(0);
  const setState = jest.fn();

  return {
    incidentMapRef,
    pendingEventsRef,
    flushTimerRef,
    lastUpdatedRef,
    lastTotalEventsRef,
    setState,
    hookArgs: {
      enabled: true,
      stableLocation: null as [number, number] | null,
      sinceDays: 30,
      effectiveMaxIncidents: INCIDENT_LIMITS.MAX_VISIBLE,
      incidentMapRef,
      pendingEventsRef,
      flushTimerRef,
      lastUpdatedRef,
      lastTotalEventsRef,
      hasReceivedHistory: () => true,
      setState: setState as Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>,
    },
  };
}

describe('useIncidentSubscriptionStateSyncController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    resetIncidentIntakeMetrics();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('drops oversize raw events before queueing', () => {
    const nowMs = 1_735_689_600_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(nowMs);
    const { hookArgs, pendingEventsRef } = createHookArgs();

    const { result } = renderHook(() =>
      useIncidentSubscriptionStateSyncController(hookArgs)
    );

    act(() => {
      result.current.enqueueEvents(
        [
          createEvent('oversize', Math.floor(nowMs / 1000), {
            content: 'x'.repeat(INCIDENT_LIMITS.MAX_EVENT_CONTENT_LENGTH + 1),
          }),
        ],
        'relay'
      );
    });

    expect(pendingEventsRef.current).toHaveLength(0);
    expect(getIncidentIntakeMetrics().droppedOversizeContent).toBe(1);

    nowSpy.mockRestore();
  });

  it('collapses queued revisions for the same incident to the newest raw event', () => {
    const nowMs = 1_735_689_600_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(nowMs);
    const { hookArgs, pendingEventsRef } = createHookArgs();

    const { result } = renderHook(() =>
      useIncidentSubscriptionStateSyncController(hookArgs)
    );

    act(() => {
      result.current.enqueueEvents(
        [createEvent('incident-a', Math.floor(nowMs / 1000) - 1, { eventId: 'event-a-v1' })],
        'relay'
      );
      result.current.enqueueEvents(
        [createEvent('incident-a', Math.floor(nowMs / 1000), { eventId: 'event-a-v2' })],
        'relay'
      );
    });

    expect(pendingEventsRef.current).toHaveLength(1);
    expect(pendingEventsRef.current[0].eventId).toBe('event-a-v2');
    expect(getIncidentIntakeMetrics().queueCollapses).toBe(1);

    nowSpy.mockRestore();
  });

  it('caps the pending raw queue and retains the newest arrivals', () => {
    const nowMs = 1_735_689_600_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(nowMs);
    const { hookArgs, pendingEventsRef } = createHookArgs();

    const { result } = renderHook(() =>
      useIncidentSubscriptionStateSyncController(hookArgs)
    );

    const events = Array.from(
      { length: INCIDENT_LIMITS.MAX_PENDING_QUEUE + 5 },
      (_, index) =>
        createEvent(`incident-${index}`, calculateIncidentSinceUnixSeconds(30, nowMs) + index + 1, {
          eventId: `event-${index}`,
        })
    );

    act(() => {
      result.current.enqueueEvents(events, 'relay');
    });

    expect(pendingEventsRef.current).toHaveLength(INCIDENT_LIMITS.MAX_PENDING_QUEUE);
    expect(pendingEventsRef.current[0].queueKey).toBe('incident-5');
    expect(pendingEventsRef.current[pendingEventsRef.current.length - 1].queueKey).toBe(
      `incident-${INCIDENT_LIMITS.MAX_PENDING_QUEUE + 4}`
    );
    expect(getIncidentIntakeMetrics().droppedQueueOverflow).toBe(5);
    expect(getIncidentIntakeMetrics().peakPendingQueueLength).toBe(
      INCIDENT_LIMITS.MAX_PENDING_QUEUE
    );

    nowSpy.mockRestore();
  });
});
