import { startTransition, useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { NDKEvent } from '@nostr-dev-kit/mobile';

import { calculateIncidentSinceUnixSeconds } from '@lib/incidentHistoryWindow';
import { INCIDENT_LIMITS } from '@lib/map/constants';
import { buildIncidentDisplayState } from './sorting';
import { applyIncidentEventBatch } from './eventReducer';
import { markRelayConfirmedIncident, type RelayConfirmationMapRef } from './cacheConfirmation';
import {
  INITIAL_HISTORY_FLUSH_CHUNK_SIZE,
  INITIAL_HISTORY_FLUSH_CONTINUATION_MS,
  INITIAL_HISTORY_RELAY_BUFFER_MS,
  INCIDENT_KIND,
  SUBSCRIPTION_BUFFER_MS,
} from './types';
import type {
  IncidentSubscriptionDisplayState,
  IncomingEventSource,
  QueuedEvent,
  ProcessedIncident,
} from './types';

// Keep subscription logs dev-only and opt-in to reduce noise during normal local runs.
const DEBUG_CACHE =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_INCIDENT_SUBSCRIPTION === '1';
const DEBUG_HISTORY_WINDOW =
  __DEV__ &&
  process.env.EXPO_PUBLIC_DEBUG_INCIDENT_HISTORY_WINDOW === '1' &&
  (globalThis as Record<string, unknown>).describe == null;

type IncidentIntakeMetrics = {
  droppedInvalidKind: number;
  droppedOversizeContent: number;
  droppedMalformedTags: number;
  droppedOversizeEventId: number;
  droppedStaleEvents: number;
  droppedQueueOverflow: number;
  queueCollapses: number;
  peakPendingQueueLength: number;
};

type IntakeDropReason =
  | 'droppedInvalidKind'
  | 'droppedOversizeContent'
  | 'droppedMalformedTags'
  | 'droppedOversizeEventId'
  | 'droppedStaleEvents';

type RawEventValidationResult =
  | {
      ok: true;
      createdAt?: number;
      eventId: string;
      incidentId: string | null;
      queueKey: string;
    }
  | {
      ok: false;
      reason: IntakeDropReason;
    };

const INTAKE_METRICS: IncidentIntakeMetrics = {
  droppedInvalidKind: 0,
  droppedOversizeContent: 0,
  droppedMalformedTags: 0,
  droppedOversizeEventId: 0,
  droppedStaleEvents: 0,
  droppedQueueOverflow: 0,
  queueCollapses: 0,
  peakPendingQueueLength: 0,
};

export function getIncidentIntakeMetrics(): IncidentIntakeMetrics {
  return { ...INTAKE_METRICS };
}

export function resetIncidentIntakeMetrics(): void {
  INTAKE_METRICS.droppedInvalidKind = 0;
  INTAKE_METRICS.droppedOversizeContent = 0;
  INTAKE_METRICS.droppedMalformedTags = 0;
  INTAKE_METRICS.droppedOversizeEventId = 0;
  INTAKE_METRICS.droppedStaleEvents = 0;
  INTAKE_METRICS.droppedQueueOverflow = 0;
  INTAKE_METRICS.queueCollapses = 0;
  INTAKE_METRICS.peakPendingQueueLength = 0;
}

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

function clearSubscriptionFlushTimer(
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  flushTimerDelayMsRef: MutableRefObject<number | null>
): void {
  if (flushTimerRef.current) {
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
  }
  flushTimerDelayMsRef.current = null;
}

function scheduleSubscriptionFlushTimer(
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  flushTimerDelayMsRef: MutableRefObject<number | null>,
  flushQueuedEvents: () => void,
  requestedDelayMs: number
): void {
  const currentDelayMs = flushTimerDelayMsRef.current;
  if (flushTimerRef.current && currentDelayMs != null && currentDelayMs <= requestedDelayMs) {
    return;
  }

  clearSubscriptionFlushTimer(flushTimerRef, flushTimerDelayMsRef);

  flushTimerDelayMsRef.current = requestedDelayMs;
  flushTimerRef.current = setTimeout(() => {
    flushTimerRef.current = null;
    flushTimerDelayMsRef.current = null;
    flushQueuedEvents();
  }, requestedDelayMs);
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

function enqueueIncidentEvents(
  events: NDKEvent[],
  source: IncomingEventSource,
  pendingEventsRef: MutableRefObject<QueuedEvent[]>,
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  flushTimerDelayMsRef: MutableRefObject<number | null>,
  minCreatedAtUnixSeconds: number,
  flushQueuedEvents: () => void,
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef,
  getBufferDelayMs: (source: IncomingEventSource) => number,
  subscriptionKey?: string
): void {
  if (!events || events.length === 0) {
    return;
  }

  for (const event of events) {
    const validated = validateQueuedIncidentEvent(event, minCreatedAtUnixSeconds);
    if (!validated.ok) {
      INTAKE_METRICS[validated.reason] += 1;
      continue;
    }

    const nextQueuedEvent: QueuedEvent = {
      event,
      source,
      subscriptionKey,
      queueKey: validated.queueKey,
      incidentId: validated.incidentId,
      createdAt: validated.createdAt,
      eventId: validated.eventId,
      rawEventCount: 1,
      cacheEventCount: source === 'cache' ? 1 : 0,
      relayEventCount: source === 'relay' ? 1 : 0,
    };

    if (source === 'relay') {
      markRelayConfirmedIncident(
        relayConfirmedIncidentIdsBySubscriptionKeyRef,
        subscriptionKey,
        validated.incidentId
      );
    }

    const existingIndex = findQueuedEventIndex(
      pendingEventsRef.current,
      validated.queueKey
    );
    if (existingIndex >= 0) {
      const existingQueuedEvent = pendingEventsRef.current[existingIndex];
      if (
        shouldReplaceQueuedEvent(
          existingQueuedEvent.createdAt ?? 0,
          existingQueuedEvent.eventId ?? '',
          validated.createdAt ?? 0,
          validated.eventId
        )
      ) {
        pendingEventsRef.current[existingIndex] = {
          ...nextQueuedEvent,
          rawEventCount: (existingQueuedEvent.rawEventCount ?? 1) + 1,
          cacheEventCount:
            (existingQueuedEvent.cacheEventCount ??
              (existingQueuedEvent.source === 'cache' ? 1 : 0)) +
            (source === 'cache' ? 1 : 0),
          relayEventCount:
            (existingQueuedEvent.relayEventCount ??
              (existingQueuedEvent.source === 'relay' ? 1 : 0)) +
            (source === 'relay' ? 1 : 0),
        };
        INTAKE_METRICS.queueCollapses += 1;
      } else {
        existingQueuedEvent.rawEventCount = (existingQueuedEvent.rawEventCount ?? 1) + 1;
        existingQueuedEvent.cacheEventCount =
          (existingQueuedEvent.cacheEventCount ??
            (existingQueuedEvent.source === 'cache' ? 1 : 0)) +
          (source === 'cache' ? 1 : 0);
        existingQueuedEvent.relayEventCount =
          (existingQueuedEvent.relayEventCount ??
            (existingQueuedEvent.source === 'relay' ? 1 : 0)) +
          (source === 'relay' ? 1 : 0);
      }
      continue;
    }

    if (pendingEventsRef.current.length >= INCIDENT_LIMITS.MAX_PENDING_QUEUE) {
      const droppedQueuedEvent = pendingEventsRef.current.shift();
      INTAKE_METRICS.droppedQueueOverflow += droppedQueuedEvent?.rawEventCount ?? 1;
    }

    pendingEventsRef.current.push(nextQueuedEvent);
    if (pendingEventsRef.current.length > INTAKE_METRICS.peakPendingQueueLength) {
      INTAKE_METRICS.peakPendingQueueLength = pendingEventsRef.current.length;
    }
  }

  scheduleSubscriptionFlushTimer(
    flushTimerRef,
    flushTimerDelayMsRef,
    flushQueuedEvents,
    getBufferDelayMs(source)
  );
}

function getIncidentIdFromTags(tags: NDKEvent['tags']): string | null {
  for (const tag of tags ?? []) {
    if (!Array.isArray(tag) || tag.length < 2) {
      continue;
    }
    if (tag[0] !== 'd') {
      continue;
    }
    if (typeof tag[1] === 'string' && tag[1].length > 0) {
      return tag[1];
    }
  }

  return null;
}

function validateQueuedIncidentEvent(
  event: NDKEvent,
  minCreatedAtUnixSeconds: number
): RawEventValidationResult {
  if (event.kind !== INCIDENT_KIND) {
    return { ok: false, reason: 'droppedInvalidKind' };
  }

  const hasFiniteCreatedAt =
    typeof event.created_at === 'number' && Number.isFinite(event.created_at);
  const normalizedCreatedAt =
    hasFiniteCreatedAt && typeof event.created_at === 'number' ? event.created_at : 0;

  if (hasFiniteCreatedAt && normalizedCreatedAt < minCreatedAtUnixSeconds) {
    return { ok: false, reason: 'droppedStaleEvents' };
  }

  if (
    typeof event.id !== 'string' ||
    event.id.length === 0 ||
    event.id.length > INCIDENT_LIMITS.MAX_EVENT_ID_LENGTH
  ) {
    return { ok: false, reason: 'droppedOversizeEventId' };
  }

  if (
    typeof event.content !== 'string' ||
    event.content.length > INCIDENT_LIMITS.MAX_EVENT_CONTENT_LENGTH
  ) {
    return { ok: false, reason: 'droppedOversizeContent' };
  }

  if (!Array.isArray(event.tags) || event.tags.length > INCIDENT_LIMITS.MAX_EVENT_TAGS) {
    return { ok: false, reason: 'droppedMalformedTags' };
  }

  for (const tag of event.tags) {
    if (!Array.isArray(tag)) {
      return { ok: false, reason: 'droppedMalformedTags' };
    }

    for (const value of tag) {
      if (
        typeof value !== 'string' ||
        value.length > INCIDENT_LIMITS.MAX_EVENT_TAG_VALUE_LENGTH
      ) {
        return { ok: false, reason: 'droppedMalformedTags' };
      }
    }
  }

  const incidentId = getIncidentIdFromTags(event.tags);

  return {
    ok: true,
    createdAt: hasFiniteCreatedAt ? normalizedCreatedAt : undefined,
    eventId: event.id,
    incidentId,
    queueKey: incidentId || event.id,
  };
}

function findQueuedEventIndex(queue: readonly QueuedEvent[], queueKey: string): number {
  for (let index = 0; index < queue.length; index += 1) {
    if (queue[index].queueKey === queueKey) {
      return index;
    }
  }

  return -1;
}

function shouldReplaceQueuedEvent(
  existingCreatedAt: number,
  existingEventId: string,
  incomingCreatedAt: number,
  incomingEventId: string
): boolean {
  if (incomingCreatedAt > existingCreatedAt) {
    return true;
  }

  if (incomingCreatedAt === existingCreatedAt) {
    return incomingEventId.localeCompare(existingEventId) > 0;
  }

  return false;
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
