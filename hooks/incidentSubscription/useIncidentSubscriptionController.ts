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
import { SUBSCRIPTION_BUFFER_MS, type IncidentSubscriptionDisplayState, type IncomingEventSource, type QueuedEvent, type ProcessedIncident } from './types';

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
    return computeHasReceivedHistory(
      enabled,
      subscriptionRegistry.subscriptions.keys(),
      subscriptionRegistry.eoseBySubscriptionKey,
      desiredSubscriptionCount
    );
  }, [enabled, desiredSubscriptionCount, subscriptionRegistry]);

  const recomputeVisibleState = useCallback(
    (updatedIncidents: ProcessedIncident[] = []) => {
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
    },
    [enabled, effectiveMaxIncidents, hasReceivedHistory, lastUpdatedRef, setState, stableLocation, incidentMapRef]
  );

  const clearFlushTimer = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, [flushTimerRef]);

  const flushQueuedEvents = useCallback(() => {
    clearFlushTimer();

    const queued = pendingEventsRef.current;
    if (queued.length === 0) {
      return;
    }

    pendingEventsRef.current = [];

    const reducerResult = applyIncidentEventBatch({
      queuedEvents: queued,
      incidentMap: incidentMapRef.current,
      maxCandidateRetention: INCIDENT_LIMITS.CANDIDATE_RETENTION,
      location: stableLocation,
    });
    incidentMapRef.current = reducerResult.incidentMap;

    const { didUpdate, totalRelevantEvents, cacheCount, relayCount } = reducerResult;

    if (totalRelevantEvents === 0) {
      return;
    }

    lastTotalEventsRef.current += totalRelevantEvents;

    if (DEBUG_CACHE) {
      console.log(
        `📥 [IncidentSub] +${totalRelevantEvents} events (cache:${cacheCount}, relay:${relayCount})`
      );
    }

    if (didUpdate) {
      recomputeVisibleState(reducerResult.updatedIncidents);
      return;
    }

    setState((prev) => ({
      ...prev,
      totalEventsReceived: lastTotalEventsRef.current,
      updatedIncidents: [],
      hasReceivedHistory: hasReceivedHistory(),
    }));
  }, [clearFlushTimer, recomputeVisibleState, hasReceivedHistory, incidentMapRef, lastTotalEventsRef, pendingEventsRef, setState, stableLocation]);

  const enqueueEvents = useCallback(
    (events: NDKEvent[], source: IncomingEventSource) => {
      if (!events || events.length === 0) {
        return;
      }

      for (const event of events) {
        pendingEventsRef.current.push({ event, source });
      }

      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(flushQueuedEvents, SUBSCRIPTION_BUFFER_MS);
      }
    },
    [flushQueuedEvents, flushTimerRef, pendingEventsRef]
  );

  const startSubscription = useCallback(
    (key: string) => {
      const beforeCount = subscriptionRegistry.subscriptions.size;
      if (DEBUG_CACHE) {
        console.log(
          `🔔 [IncidentSub] Start requested for key ${key} (live before:${beforeCount})`
        );
      }

      const filter: NDKFilter = {
        kinds: [30911 as number],
        '#g': [key],
        limit: INCIDENT_LIMITS.FETCH_LIMIT,
      };

      const subscription = ndk.subscribe([filter], {
        closeOnEose: false,
        cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
        groupable: false,
        onEvents: (events) => {
          enqueueEvents(events, 'cache');
        },
        onEvent: (event) => {
          enqueueEvents([event], 'relay');
        },
        onEose: () => {
          subscriptionRegistry.setHasReceivedHistory(key);
          setState((prev) => ({
            ...prev,
            hasReceivedHistory: hasReceivedHistory(),
          }));
        },
      });

      subscriptionRegistry.start(key, subscription);
      if (DEBUG_CACHE) {
        const afterCount = subscriptionRegistry.subscriptions.size;
        console.log(
          `✅ [IncidentSub] Subscribed key ${key} (live after:${afterCount})`
        );
      }
    },
    [enqueueEvents, hasReceivedHistory, setState, subscriptionRegistry]
  );

  const stopSubscription = useCallback(
    (key: string) => {
      const beforeCount = subscriptionRegistry.subscriptions.size;
      if (DEBUG_CACHE && subscriptionRegistry.subscriptions.has(key)) {
        console.log(
          `🛑 [IncidentSub] Stop requested for key ${key} (live before:${beforeCount})`
        );
      }

      subscriptionRegistry.stop(key);

      if (DEBUG_CACHE) {
        const afterCount = subscriptionRegistry.subscriptions.size;
        if (beforeCount !== afterCount) {
          console.log(
            `🛑 [IncidentSub] Stopped key ${key} (live after:${afterCount})`
          );
        }
      }
    },
    [subscriptionRegistry]
  );

  const stopAllSubscriptions = useCallback(() => {
    if (DEBUG_CACHE) {
      const beforeCount = subscriptionRegistry.subscriptions.size;
      if (beforeCount > 0) {
        console.log(
          `🧹 [IncidentSub] stopAll requested (live before:${beforeCount})`
        );
      }
    }
    subscriptionRegistry.stopAll();
    if (DEBUG_CACHE) {
      const afterCount = subscriptionRegistry.subscriptions.size;
      if (afterCount === 0) {
        console.log(`🧹 [IncidentSub] stopAll complete (live after:${afterCount})`);
      }
    }
  }, [subscriptionRegistry]);

  const pruneToDesiredGeohashes = useCallback(
    (desiredKeys: Set<string>) => {
      const { incidentMap, didPrune } = pruneIncidentsByDesiredCells({
        incidentMap: incidentMapRef.current,
        desiredCells: desiredKeys,
        geohashPrecision: MAP_SUBSCRIPTION.GEOHASH_PRECISION,
      });
      if (didPrune) {
        incidentMapRef.current = incidentMap;
      }
      return didPrune;
    },
    [incidentMapRef]
  );

  const clearQueuedEvents = useCallback(() => {
    clearFlushTimer();
    pendingEventsRef.current = [];
  }, [clearFlushTimer, pendingEventsRef]);

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

