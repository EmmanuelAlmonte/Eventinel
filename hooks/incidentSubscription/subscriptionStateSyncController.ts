import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { NDKEvent } from '@nostr-dev-kit/mobile';

import { calculateIncidentSinceUnixSeconds } from '@lib/incidentHistoryWindow';
import { INCIDENT_LIMITS } from '@lib/map/constants';
import { buildIncidentDisplayState } from './sorting';
import { applyIncidentEventBatch } from './eventReducer';
import type {
  IncidentSubscriptionDisplayState,
  IncomingEventSource,
  QueuedEvent,
  ProcessedIncident,
} from './types';
import { SUBSCRIPTION_BUFFER_MS } from './types';

// Keep subscription logs dev-only and opt-in to reduce noise during normal local runs.
const DEBUG_CACHE =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_INCIDENT_SUBSCRIPTION === '1';
const DEBUG_HISTORY_WINDOW =
  __DEV__ && (globalThis as Record<string, unknown>).describe == null;

function logHistoryWindowDebugEvent(
  event: string,
  details?: Record<string, unknown>
) {
  if (!DEBUG_HISTORY_WINDOW) {
    return;
  }

  if (details) {
    console.info(`[HistoryWindowDebug] ${event}`, details);
    return;
  }

  console.info(`[HistoryWindowDebug] ${event}`);
}

function recomputeVisibleSubscriptionState(
  {
    enabled,
    incidentMapRef,
    sinceDays,
    stableLocation,
    effectiveMaxIncidents,
    lastUpdatedRef,
    lastTotalEventsRef,
    hasReceivedHistory,
    setState,
  }: {
    enabled: boolean;
    incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
    sinceDays: number;
    stableLocation: [number, number] | null;
    effectiveMaxIncidents: number;
    lastUpdatedRef: MutableRefObject<number | null>;
    lastTotalEventsRef: MutableRefObject<number>;
    hasReceivedHistory: () => boolean;
    setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
  },
  updatedIncidents: ProcessedIncident[] = []
): void {
  if (!enabled) {
    return;
  }

  const cutoffUnixSeconds = calculateIncidentSinceUnixSeconds(sinceDays);
  const cutoffMs = cutoffUnixSeconds * 1000;
  const { incidents, severityCounts } = buildIncidentDisplayState({
    incidentMap: incidentMapRef.current,
    location: stableLocation,
    maxIncidents: effectiveMaxIncidents,
    minOccurredAtMs: cutoffMs,
  });

  const visibleOutOfWindowIncidents = incidents.filter(
    (incident) => incident.occurredAtMs < cutoffMs
  );

  if (updatedIncidents.length > 0) {
    lastUpdatedRef.current = Date.now();
  }

  logHistoryWindowDebugEvent('visible window check', {
    historyWindowDays: sinceDays,
    cutoffUnixSeconds,
    visibleIncidentCount: incidents.length,
    updatedIncidentCount: updatedIncidents.length,
    visibleOutOfWindowCount: visibleOutOfWindowIncidents.length,
    visibleOutOfWindowSamples: visibleOutOfWindowIncidents.slice(0, 3).map((incident) => ({
      incidentId: incident.incidentId,
      eventId: incident.eventId,
      createdAtMs: incident.createdAtMs,
      occurredAtMs: incident.occurredAtMs,
      title: incident.title,
    })),
  });

  setState({
    incidents,
    severityCounts,
    updatedIncidents,
    totalEventsReceived: lastTotalEventsRef.current,
    hasReceivedHistory: hasReceivedHistory(),
  });
}

function clearSubscriptionFlushTimer(
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
): void {
  if (flushTimerRef.current) {
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
  }
}

function flushQueuedIncidentEvents(
  args: {
    stableLocation: [number, number] | null;
    sinceDays: number;
    incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
    pendingEventsRef: MutableRefObject<QueuedEvent[]>;
    flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
    lastTotalEventsRef: MutableRefObject<number>;
    lastUpdatedRef: MutableRefObject<number | null>;
    setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
    hasReceivedHistory: () => boolean;
  },
  updatedStateCallback: (updatedIncidents: ProcessedIncident[]) => void
): void {
  clearSubscriptionFlushTimer(args.flushTimerRef);

  const queued = args.pendingEventsRef.current;
  if (queued.length === 0) {
    return;
  }

  args.pendingEventsRef.current = [];

  const reducerResult = applyIncidentEventBatch({
    queuedEvents: queued,
    incidentMap: args.incidentMapRef.current,
    maxCandidateRetention: INCIDENT_LIMITS.CANDIDATE_RETENTION,
    location: args.stableLocation,
    minCreatedAtUnixSeconds: calculateIncidentSinceUnixSeconds(args.sinceDays),
  });
  args.incidentMapRef.current = reducerResult.incidentMap;

  const { didUpdate, totalRelevantEvents, cacheCount, relayCount } = reducerResult;
  if (totalRelevantEvents === 0) {
    return;
  }

  args.lastTotalEventsRef.current += totalRelevantEvents;

  if (DEBUG_CACHE) {
    console.log(
      `📥 [IncidentSub] +${totalRelevantEvents} events (cache:${cacheCount}, relay:${relayCount})`
    );
  }

  if (didUpdate) {
    updatedStateCallback(reducerResult.updatedIncidents);
    return;
  }

  args.setState((prev) => ({
    ...prev,
    totalEventsReceived: args.lastTotalEventsRef.current,
    updatedIncidents: [],
    hasReceivedHistory: args.hasReceivedHistory(),
  }));
}

function enqueueIncidentEvents(
  events: NDKEvent[],
  source: IncomingEventSource,
  pendingEventsRef: MutableRefObject<QueuedEvent[]>,
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  flushQueuedEvents: () => void
): void {
  if (!events || events.length === 0) {
    return;
  }

  for (const event of events) {
    pendingEventsRef.current.push({ event, source });
  }

  if (!flushTimerRef.current) {
    flushTimerRef.current = setTimeout(flushQueuedEvents, SUBSCRIPTION_BUFFER_MS);
  }
}

export function useIncidentSubscriptionStateSyncController({
  enabled,
  stableLocation,
  sinceDays,
  effectiveMaxIncidents,
  incidentMapRef,
  pendingEventsRef,
  flushTimerRef,
  lastUpdatedRef,
  lastTotalEventsRef,
  hasReceivedHistory,
  setState,
}: {
  enabled: boolean;
  stableLocation: [number, number] | null;
  sinceDays: number;
  effectiveMaxIncidents: number;
  incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
  pendingEventsRef: MutableRefObject<QueuedEvent[]>;
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  lastUpdatedRef: MutableRefObject<number | null>;
  lastTotalEventsRef: MutableRefObject<number>;
  hasReceivedHistory: () => boolean;
  setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
}) {
  const clearFlushTimer = useCallback(
    () => clearSubscriptionFlushTimer(flushTimerRef),
    [flushTimerRef]
  );

  const recomputeVisibleState = useCallback(
    (updatedIncidents: ProcessedIncident[] = []) =>
      recomputeVisibleSubscriptionState(
        {
          enabled,
          incidentMapRef,
          sinceDays,
          stableLocation,
          effectiveMaxIncidents,
          lastUpdatedRef,
          lastTotalEventsRef,
          hasReceivedHistory,
          setState,
        },
        updatedIncidents
      ),
    [
      enabled,
      effectiveMaxIncidents,
      hasReceivedHistory,
      incidentMapRef,
      lastUpdatedRef,
      lastTotalEventsRef,
      setState,
      sinceDays,
      stableLocation,
    ]
  );

  const flushQueuedEvents = useCallback(() => {
    flushQueuedIncidentEvents(
      {
        stableLocation,
        sinceDays,
        incidentMapRef,
        pendingEventsRef,
        flushTimerRef,
        lastTotalEventsRef,
        lastUpdatedRef,
        setState,
        hasReceivedHistory,
      },
      recomputeVisibleState
    );
  }, [
    sinceDays,
    stableLocation,
    incidentMapRef,
    pendingEventsRef,
    flushTimerRef,
    lastTotalEventsRef,
    setState,
    hasReceivedHistory,
    recomputeVisibleState,
    lastUpdatedRef,
  ]);

  const enqueueEvents = useCallback(
    (events: NDKEvent[], source: IncomingEventSource) =>
      enqueueIncidentEvents(
        events,
        source,
        pendingEventsRef,
        flushTimerRef,
        flushQueuedEvents
      ),
    [flushQueuedEvents, flushTimerRef, pendingEventsRef]
  );

  const clearQueuedEvents = useCallback(() => {
    clearFlushTimer();
    pendingEventsRef.current = [];
  }, [clearFlushTimer, pendingEventsRef]);

  return {
    recomputeVisibleState,
    flushQueuedEvents,
    enqueueEvents,
    clearQueuedEvents,
  };
}
