import { startTransition, useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { NDKEvent } from '@nostr-dev-kit/mobile';

import { calculateIncidentSinceUnixSeconds } from '@lib/incidentHistoryWindow';
import { INCIDENT_LIMITS } from '@lib/map/constants';
import { buildIncidentDisplayState } from './sorting';
import { applyIncidentEventBatch } from './eventReducer';
import type { RelayConfirmationMapRef } from './cacheConfirmation';
import {
  clearSubscriptionFlushTimer,
  enqueueIncidentEvents,
  getIncidentIntakeMetrics,
  resetIncidentIntakeMetrics,
  scheduleSubscriptionFlushTimer,
} from './subscriptionEventQueue';
import {
  INITIAL_HISTORY_FLUSH_CHUNK_SIZE,
  INITIAL_HISTORY_FLUSH_CONTINUATION_MS,
  INITIAL_HISTORY_RELAY_BUFFER_MS,
  SUBSCRIPTION_BUFFER_MS,
} from './types';
import type {
  IncidentSubscriptionDisplayState,
  IncomingEventSource,
  QueuedEvent,
  ProcessedIncident,
} from './types';

export { getIncidentIntakeMetrics, resetIncidentIntakeMetrics };

// Keep subscription logs dev-only and opt-in to reduce noise during normal local runs.
const DEBUG_CACHE =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_INCIDENT_SUBSCRIPTION === '1';
const DEBUG_HISTORY_WINDOW =
  __DEV__ &&
  process.env.EXPO_PUBLIC_DEBUG_INCIDENT_HISTORY_WINDOW === '1' &&
  (globalThis as Record<string, unknown>).describe == null;

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
  updatedIncidents: ProcessedIncident[] = [],
  removedIncidentIds: string[] = []
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

  if (updatedIncidents.length > 0 || removedIncidentIds.length > 0) {
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

  startTransition(() => {
    setState((prev) => ({
      incidents,
      severityCounts,
      updatedIncidents:
        updatedIncidents.length === 0 && removedIncidentIds.length > 0
          ? prev.updatedIncidents
          : updatedIncidents,
      removedIncidentIds,
      totalEventsReceived: lastTotalEventsRef.current,
      hasReceivedHistory: hasReceivedHistory(),
    }));
  });
}

function flushQueuedIncidentEvents(
  args: {
    stableLocation: [number, number] | null;
    sinceDays: number;
    incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
    pendingEventsRef: MutableRefObject<QueuedEvent[]>;
    flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
    flushTimerDelayMsRef: MutableRefObject<number | null>;
    lastTotalEventsRef: MutableRefObject<number>;
    lastUpdatedRef: MutableRefObject<number | null>;
    setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
    hasReceivedHistory: () => boolean;
  },
  updatedStateCallback: (updatedIncidents: ProcessedIncident[]) => void
): void {
  clearSubscriptionFlushTimer(args.flushTimerRef, args.flushTimerDelayMsRef);

  const shouldChunkInitialHistory = !args.hasReceivedHistory();
  const queued = shouldChunkInitialHistory
    ? args.pendingEventsRef.current.slice(0, INITIAL_HISTORY_FLUSH_CHUNK_SIZE)
    : args.pendingEventsRef.current;
  if (queued.length === 0) {
    return;
  }

  args.pendingEventsRef.current = shouldChunkInitialHistory
    ? args.pendingEventsRef.current.slice(INITIAL_HISTORY_FLUSH_CHUNK_SIZE)
    : [];

  const reducerResult = applyIncidentEventBatch({
    queuedEvents: queued,
    incidentMap: args.incidentMapRef.current,
    maxCandidateRetention: INCIDENT_LIMITS.CANDIDATE_RETENTION,
    maxParseCandidates: INCIDENT_LIMITS.MAX_PARSE_CANDIDATES,
    location: args.stableLocation,
    minCreatedAtUnixSeconds: calculateIncidentSinceUnixSeconds(args.sinceDays),
  });
  args.incidentMapRef.current = reducerResult.incidentMap;

  const { didUpdate, totalRelevantEvents, cacheCount, relayCount } = reducerResult;
  if (totalRelevantEvents === 0) {
    if (args.pendingEventsRef.current.length > 0) {
      scheduleSubscriptionFlushTimer(
        args.flushTimerRef,
        args.flushTimerDelayMsRef,
        () => flushQueuedIncidentEvents(args, updatedStateCallback),
        INITIAL_HISTORY_FLUSH_CONTINUATION_MS
      );
    }
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
    if (args.pendingEventsRef.current.length > 0) {
      scheduleSubscriptionFlushTimer(
        args.flushTimerRef,
        args.flushTimerDelayMsRef,
        () => flushQueuedIncidentEvents(args, updatedStateCallback),
        INITIAL_HISTORY_FLUSH_CONTINUATION_MS
      );
    }
    return;
  }

  args.setState((prev) => ({
    ...prev,
    totalEventsReceived: args.lastTotalEventsRef.current,
    updatedIncidents: [],
    removedIncidentIds: [],
    hasReceivedHistory: args.hasReceivedHistory(),
  }));

  if (args.pendingEventsRef.current.length > 0) {
    scheduleSubscriptionFlushTimer(
      args.flushTimerRef,
      args.flushTimerDelayMsRef,
      () => flushQueuedIncidentEvents(args, updatedStateCallback),
      INITIAL_HISTORY_FLUSH_CONTINUATION_MS
    );
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
  flushTimerDelayMsRef,
  lastUpdatedRef,
  lastTotalEventsRef,
  relayConfirmedIncidentIdsBySubscriptionKeyRef,
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
  flushTimerDelayMsRef: MutableRefObject<number | null>;
  lastUpdatedRef: MutableRefObject<number | null>;
  lastTotalEventsRef: MutableRefObject<number>;
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef;
  hasReceivedHistory: () => boolean;
  setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
}) {
  const clearFlushTimer = useCallback(
    () => clearSubscriptionFlushTimer(flushTimerRef, flushTimerDelayMsRef),
    [flushTimerDelayMsRef, flushTimerRef]
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

  const recomputeVisibleStateWithRemovals = useCallback(
    (updatedIncidents: ProcessedIncident[] = [], removedIncidentIds: string[] = []) =>
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
        updatedIncidents,
        removedIncidentIds
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
        flushTimerDelayMsRef,
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
    flushTimerDelayMsRef,
    lastTotalEventsRef,
    setState,
    hasReceivedHistory,
    recomputeVisibleState,
    lastUpdatedRef,
    relayConfirmedIncidentIdsBySubscriptionKeyRef,
  ]);

  const enqueueEvents = useCallback(
    (events: NDKEvent[], source: IncomingEventSource, subscriptionKey?: string) =>
      enqueueIncidentEvents(
        events,
        source,
        pendingEventsRef,
        flushTimerRef,
        flushTimerDelayMsRef,
        calculateIncidentSinceUnixSeconds(sinceDays),
        flushQueuedEvents,
        relayConfirmedIncidentIdsBySubscriptionKeyRef,
        (eventSource) =>
          !hasReceivedHistory() && eventSource === 'relay'
            ? INITIAL_HISTORY_RELAY_BUFFER_MS
            : SUBSCRIPTION_BUFFER_MS,
        subscriptionKey
      ),
    [
      flushQueuedEvents,
      flushTimerRef,
      flushTimerDelayMsRef,
      hasReceivedHistory,
      pendingEventsRef,
      relayConfirmedIncidentIdsBySubscriptionKeyRef,
      sinceDays,
    ]
  );

  const clearQueuedEvents = useCallback(() => {
    clearFlushTimer();
    pendingEventsRef.current = [];
  }, [clearFlushTimer, pendingEventsRef]);

  return {
    recomputeVisibleState,
    recomputeVisibleStateWithRemovals,
    flushQueuedEvents,
    enqueueEvents,
    clearQueuedEvents,
  };
}
