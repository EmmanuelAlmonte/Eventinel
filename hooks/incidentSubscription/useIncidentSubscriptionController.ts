import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  NDKFilter,
  NDKSubscription,
  type NDKEvent,
  NDKSubscriptionCacheUsage,
} from '@nostr-dev-kit/mobile';

import { MAP_SUBSCRIPTION } from '@lib/map/constants';
import { INCIDENT_LIMITS } from '@lib/map/constants';
import { ndk } from '@lib/ndk';
import { buildIncidentDisplayState } from './sorting';
import { applyIncidentEventBatch } from './eventReducer';
import { computeHasReceivedHistory, pruneIncidentsByDesiredCells } from './reconcile';
import {
  SUBSCRIPTION_BUFFER_MS,
  type IncidentSubscriptionDisplayState,
  type IncomingEventSource,
  type QueuedEvent,
  type ProcessedIncident,
} from './types';

const DEBUG_CACHE =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_INCIDENT_SUBSCRIPTION === '1';

type RegistryLike = {
  subscriptions: Map<string, NDKSubscription>;
  eoseBySubscriptionKey: Map<string, boolean>;
  start: (key: string, subscription: NDKSubscription) => void;
  stop: (key: string) => void;
  stopAll: () => void;
  setHasReceivedHistory: (key: string) => void;
};

export interface SubscriptionControllerArgs {
  enabled: boolean;
  desiredSubscriptionCount: number;
  stableLocation: [number, number] | null;
  effectiveMaxIncidents: number;
  incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
  pendingEventsRef: MutableRefObject<QueuedEvent[]>;
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  lastUpdatedRef: MutableRefObject<number | null>;
  lastTotalEventsRef: MutableRefObject<number>;
  setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
  subscriptionRegistry: RegistryLike;
}

export interface SubscriptionController {
  hasReceivedHistory: () => boolean;
  recomputeVisibleState: (updatedIncidents?: ProcessedIncident[]) => void;
  flushQueuedEvents: () => void;
  enqueueEvents: (events: NDKEvent[], source: IncomingEventSource) => void;
  startSubscription: (key: string) => void;
  stopSubscription: (key: string) => void;
  stopAllSubscriptions: () => void;
  pruneToDesiredGeohashes: (desiredKeys: Set<string>) => boolean;
  clearQueuedEvents: () => void;
}

function getHasReceivedHistory({
  enabled,
  desiredSubscriptionCount,
  subscriptionRegistry,
}: {
  enabled: boolean;
  desiredSubscriptionCount: number;
  subscriptionRegistry: RegistryLike;
}): boolean {
  return computeHasReceivedHistory(
    enabled,
    subscriptionRegistry.subscriptions.keys(),
    subscriptionRegistry.eoseBySubscriptionKey,
    desiredSubscriptionCount
  );
}

function recomputeVisibleSubscriptionState({
  enabled,
  incidentMapRef,
  stableLocation,
  effectiveMaxIncidents,
  lastUpdatedRef,
  lastTotalEventsRef,
  hasReceivedHistory,
  setState,
}: {
  enabled: boolean;
  incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
  stableLocation: [number, number] | null;
  effectiveMaxIncidents: number;
  lastUpdatedRef: MutableRefObject<number | null>;
  lastTotalEventsRef: MutableRefObject<number>;
  hasReceivedHistory: () => boolean;
  setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
}, updatedIncidents: ProcessedIncident[] = []): void {
  if (!enabled) {
    return;
  }

  const { incidents, severityCounts } = buildIncidentDisplayState({
    incidentMap: incidentMapRef.current,
    location: stableLocation,
    maxIncidents: effectiveMaxIncidents,
  });

  if (updatedIncidents.length > 0) {
    lastUpdatedRef.current = Date.now();
  }

  setState({
    incidents,
    severityCounts,
    updatedIncidents,
    totalEventsReceived: lastTotalEventsRef.current,
    hasReceivedHistory: hasReceivedHistory(),
  });
}

function clearSubscriptionFlushTimer(flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>): void {
  if (flushTimerRef.current) {
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
  }
}

function flushQueuedIncidentEvents(
  args: {
    stableLocation: [number, number] | null;
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

function createIncidentSubscriptionFilter(key: string): NDKFilter {
  return {
    kinds: [30911 as number],
    '#g': [key],
    limit: INCIDENT_LIMITS.FETCH_LIMIT,
  };
}

function startIncidentSubscription(
  key: string,
  args: {
    subscriptionRegistry: RegistryLike;
    enqueueEvents: (events: NDKEvent[], source: IncomingEventSource) => void;
    hasReceivedHistory: () => boolean;
    setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
  }
): void {
  const beforeCount = args.subscriptionRegistry.subscriptions.size;
  if (DEBUG_CACHE) {
    console.log(
      `🔔 [IncidentSub] Start requested for key ${key} (live before:${beforeCount})`
    );
  }

  const subscription = ndk.subscribe([createIncidentSubscriptionFilter(key)], {
    closeOnEose: false,
    cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    groupable: false,
    onEvents: (events) => {
      args.enqueueEvents(events, 'cache');
    },
    onEvent: (event) => {
      args.enqueueEvents([event], 'relay');
    },
    onEose: () => {
      args.subscriptionRegistry.setHasReceivedHistory(key);
      args.setState((prev) => ({
        ...prev,
        hasReceivedHistory: args.hasReceivedHistory(),
      }));
    },
  });

  args.subscriptionRegistry.start(key, subscription);
  if (DEBUG_CACHE) {
    const afterCount = args.subscriptionRegistry.subscriptions.size;
    console.log(`✅ [IncidentSub] Subscribed key ${key} (live after:${afterCount})`);
  }
}

function stopIncidentSubscription(
  key: string,
  subscriptionRegistry: RegistryLike
): void {
  const beforeCount = subscriptionRegistry.subscriptions.size;
  if (DEBUG_CACHE && subscriptionRegistry.subscriptions.has(key)) {
    console.log(`🛑 [IncidentSub] Stop requested for key ${key} (live before:${beforeCount})`);
  }

  subscriptionRegistry.stop(key);

  if (DEBUG_CACHE) {
    const afterCount = subscriptionRegistry.subscriptions.size;
    if (beforeCount !== afterCount) {
      console.log(`🛑 [IncidentSub] Stopped key ${key} (live after:${afterCount})`);
    }
  }
}

function stopAllIncidentSubscriptions(subscriptionRegistry: RegistryLike): void {
  if (DEBUG_CACHE) {
    const beforeCount = subscriptionRegistry.subscriptions.size;
    if (beforeCount > 0) {
      console.log(`🧹 [IncidentSub] stopAll requested (live before:${beforeCount})`);
    }
  }

  subscriptionRegistry.stopAll();

  if (DEBUG_CACHE) {
    const afterCount = subscriptionRegistry.subscriptions.size;
    if (afterCount === 0) {
      console.log(`🧹 [IncidentSub] stopAll complete (live after:${afterCount})`);
    }
  }
}

function pruneIncidentsToDesiredGeohashes(
  desiredKeys: Set<string>,
  incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>
): boolean {
  const { incidentMap, didPrune } = pruneIncidentsByDesiredCells({
    incidentMap: incidentMapRef.current,
    desiredCells: desiredKeys,
    geohashPrecision: MAP_SUBSCRIPTION.GEOHASH_PRECISION,
  });

  if (didPrune) {
    incidentMapRef.current = incidentMap;
  }

  return didPrune;
}

function useIncidentSubscriptionStateSyncController({
  enabled,
  stableLocation,
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
      stableLocation,
    ]
  );

  const flushQueuedEvents = useCallback(() => {
    flushQueuedIncidentEvents(
      {
        stableLocation,
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

  const clearQueuedEvents = useCallback(
    () => {
      clearFlushTimer();
      pendingEventsRef.current = [];
    },
    [clearFlushTimer, pendingEventsRef]
  );

  return {
    recomputeVisibleState,
    flushQueuedEvents,
    enqueueEvents,
    clearQueuedEvents,
  };
}

function useIncidentSubscriptionPlannerController({
  subscriptionRegistry,
  enqueueEvents,
  hasReceivedHistory,
  setState,
  incidentMapRef,
}: {
  subscriptionRegistry: RegistryLike;
  enqueueEvents: (events: NDKEvent[], source: IncomingEventSource) => void;
  hasReceivedHistory: () => boolean;
  setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
  incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
}) {
  const startSubscription = useCallback(
    (key: string) =>
      startIncidentSubscription(key, {
        subscriptionRegistry,
        enqueueEvents,
        hasReceivedHistory,
        setState,
      }),
    [subscriptionRegistry, enqueueEvents, hasReceivedHistory, setState]
  );

  const stopSubscription = useCallback(
    (key: string) => stopIncidentSubscription(key, subscriptionRegistry),
    [subscriptionRegistry]
  );

  const stopAllSubscriptions = useCallback(
    () => stopAllIncidentSubscriptions(subscriptionRegistry),
    [subscriptionRegistry]
  );

  const pruneToDesiredGeohashes = useCallback(
    (desiredKeys: Set<string>) =>
      pruneIncidentsToDesiredGeohashes(desiredKeys, incidentMapRef),
    [incidentMapRef]
  );

  return {
    startSubscription,
    stopSubscription,
    stopAllSubscriptions,
    pruneToDesiredGeohashes,
  };
}

export function useIncidentSubscriptionController({
  enabled,
  desiredSubscriptionCount,
  stableLocation,
  effectiveMaxIncidents,
  incidentMapRef,
  pendingEventsRef,
  flushTimerRef,
  lastUpdatedRef,
  lastTotalEventsRef,
  setState,
  subscriptionRegistry,
}: SubscriptionControllerArgs): SubscriptionController {
  const hasReceivedHistory = useCallback(() => {
    return getHasReceivedHistory({
      enabled,
      desiredSubscriptionCount,
      subscriptionRegistry,
    });
  }, [enabled, desiredSubscriptionCount, subscriptionRegistry]);

  const { recomputeVisibleState, flushQueuedEvents, enqueueEvents, clearQueuedEvents } =
    useIncidentSubscriptionStateSyncController({
      enabled,
      stableLocation,
      effectiveMaxIncidents,
      incidentMapRef,
      pendingEventsRef,
      flushTimerRef,
      lastUpdatedRef,
      lastTotalEventsRef,
      hasReceivedHistory,
      setState,
    });

  const { startSubscription, stopSubscription, stopAllSubscriptions, pruneToDesiredGeohashes } =
    useIncidentSubscriptionPlannerController({
      subscriptionRegistry,
      enqueueEvents,
      hasReceivedHistory,
      setState,
      incidentMapRef,
    });

  return {
    hasReceivedHistory,
    recomputeVisibleState,
    flushQueuedEvents,
    enqueueEvents,
    startSubscription,
    stopSubscription,
    stopAllSubscriptions,
    pruneToDesiredGeohashes,
    clearQueuedEvents,
  };
}

