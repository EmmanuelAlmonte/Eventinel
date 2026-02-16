/**
 * useIncidentSubscription Hook
 *
 * Coordinates incident subscriptions and cache/relay event queueing.
 */

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { NDKSubscriptionCacheUsage } from '@nostr-dev-kit/mobile';
import type { NDKFilter } from '@nostr-dev-kit/mobile';
import { ndk } from '@lib/ndk';
import {
  INCIDENT_LIMITS,
  MAPBOX_CONFIG,
  MAP_SUBSCRIPTION,
} from '@lib/map/constants';
import { planIncidentCells, type MapSubscriptionViewport } from '@lib/map/subscriptionPlanner';

import { applyIncidentEventBatch, type EventBatchResult, type EventBatchInput } from './eventReducer';
import { createSubscriptionRegistry } from './subscriptionRegistry';
import {
  computeHasReceivedHistory,
  computeReconcilePlan,
  pruneIncidentsByDesiredCells,
} from './reconcile';
import {
  buildIncidentDisplayState,
  toProcessedIncident,
  EMPTY_SEVERITY_COUNTS,
} from './sorting';
import {
  SUBSCRIPTION_BUFFER_MS,
  type IncomingEventSource,
  type SeverityCounts,
  type ProcessedIncident,
  type QueuedEvent,
  type UseIncidentSubscriptionOptions,
  type UseIncidentSubscriptionResult,
} from './types';

// Debug flag - set to true to enable cache debugging logs
const DEBUG_CACHE = __DEV__;

// Re-exported types and helpers for external consumers.
export type { ProcessedIncident, UseIncidentSubscriptionOptions, UseIncidentSubscriptionResult } from './types';
export { toProcessedIncident };

export function useIncidentSubscription({
  location,
  subscriptionLocation,
  subscriptionViewport,
  enabled = true,
  maxIncidents = INCIDENT_LIMITS.MAX_VISIBLE,
}: UseIncidentSubscriptionOptions): UseIncidentSubscriptionResult {
  const effectiveMaxIncidents = Math.min(maxIncidents, INCIDENT_LIMITS.MAX_VISIBLE);
  const lastUpdatedRef = useRef<number | null>(null);
  const incidentMapRef = useRef<Map<string, ProcessedIncident>>(new Map());
  const lastTotalEventsRef = useRef(0);
  const lastFilterKeyRef = useRef<string | null>(null);
  const pendingEventsRef = useRef<QueuedEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscriptionRegistry = useRef(createSubscriptionRegistry()).current;
  const lastRefreshMetaRef = useRef({
    filterKey: 'disabled',
    desiredCount: 0,
    truncated: false,
  });

  const [state, setState] = useState<{
    incidents: ProcessedIncident[];
    severityCounts: SeverityCounts;
    updatedIncidents: ProcessedIncident[];
    totalEventsReceived: number;
    hasReceivedHistory: boolean;
  }>({
    incidents: [],
    severityCounts: EMPTY_SEVERITY_COUNTS,
    updatedIncidents: [],
    totalEventsReceived: 0,
    hasReceivedHistory: false,
  });

  const effectiveSubscriptionLocation = subscriptionLocation ?? location;
  const stableLocation = useMemo<[number, number] | null>(() => {
    if (!location) {
      return null;
    }
    return [location[0], location[1]];
  }, [location?.[0], location?.[1]]);

  const stableSubscriptionLocation = useMemo<[number, number] | null>(() => {
    if (!effectiveSubscriptionLocation) {
      return null;
    }
    return [effectiveSubscriptionLocation[0], effectiveSubscriptionLocation[1]];
  }, [effectiveSubscriptionLocation?.[0], effectiveSubscriptionLocation?.[1]]);

  const fallbackSubscriptionViewport: MapSubscriptionViewport | null =
    subscriptionViewport ??
    (stableSubscriptionLocation
      ? {
          center: stableSubscriptionLocation,
          bounds: {
            ne: stableSubscriptionLocation,
            sw: stableSubscriptionLocation,
          },
          zoom: MAPBOX_CONFIG.DEFAULT_ZOOM,
        }
      : null);

  const subscriptionPlan = useMemo(() => {
    if (!enabled || !fallbackSubscriptionViewport) {
      return null;
    }

    return planIncidentCells({
      mode: MAP_SUBSCRIPTION.SUBSCRIPTION_PLANNER_MODE,
      precision: MAP_SUBSCRIPTION.GEOHASH_PRECISION,
      center: fallbackSubscriptionViewport.center,
      bounds: fallbackSubscriptionViewport.bounds,
      zoom: fallbackSubscriptionViewport.zoom,
      maxCells: MAP_SUBSCRIPTION.MAX_ACTIVE_CELLS,
      prefetchRing: MAP_SUBSCRIPTION.SUBSCRIPTION_PREFETCH_RING,
    });
  }, [
    enabled,
    fallbackSubscriptionViewport?.center[0],
    fallbackSubscriptionViewport?.center[1],
    fallbackSubscriptionViewport?.bounds?.ne?.[0],
    fallbackSubscriptionViewport?.bounds?.ne?.[1],
    fallbackSubscriptionViewport?.bounds?.sw?.[0],
    fallbackSubscriptionViewport?.bounds?.sw?.[1],
    fallbackSubscriptionViewport?.zoom,
  ]);

  const desiredCells = subscriptionPlan?.desiredCells ?? [];
  const subscriptionFilterKey = useMemo(() => {
    if (!enabled) {
      return 'disabled';
    }
    return subscriptionPlan?.key ?? 'none';
  }, [enabled, subscriptionPlan?.key]);

  const locationKey = useMemo(() => {
    if (!location) {
      return 'none';
    }
    return `${location[0]},${location[1]}`;
  }, [location?.[0], location?.[1]]);

  const hasReceivedHistory = useCallback(() => {
    return computeHasReceivedHistory(
      enabled,
      subscriptionRegistry.subscriptions.keys(),
      subscriptionRegistry.eoseBySubscriptionKey,
      desiredCells.length
    );
  }, [enabled, desiredCells.length, subscriptionRegistry]);

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
    [enabled, stableLocation, effectiveMaxIncidents, hasReceivedHistory]
  );

  const flushQueuedEvents = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const queued = pendingEventsRef.current;
    if (queued.length === 0) {
      return;
    }

    pendingEventsRef.current = [];

    const reducerInput: EventBatchInput = {
      queuedEvents: queued,
      incidentMap: incidentMapRef.current,
      maxCandidateRetention: INCIDENT_LIMITS.CANDIDATE_RETENTION,
      location: stableLocation,
    };
    const reducerResult: EventBatchResult = applyIncidentEventBatch(reducerInput);
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
  }, [stableLocation, recomputeVisibleState, hasReceivedHistory]);

  const enqueueEvents = useCallback(
    (events: any[], source: IncomingEventSource) => {
      if (!events || events.length === 0) {
        return;
      }

      for (const event of events) {
        pendingEventsRef.current.push({ event: event as any, source });
      }

      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(flushQueuedEvents, SUBSCRIPTION_BUFFER_MS);
      }
    },
    [flushQueuedEvents]
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
    [enqueueEvents, hasReceivedHistory, subscriptionRegistry]
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
    []
  );

  // Handle enabled/disabled lifecycle.
  useEffect(() => {
    if (enabled) {
      return;
    }

    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    pendingEventsRef.current = [];
    stopAllSubscriptions();
    incidentMapRef.current.clear();
    lastUpdatedRef.current = null;
    lastTotalEventsRef.current = 0;
    lastFilterKeyRef.current = 'disabled';

    setState({
      incidents: [],
      severityCounts: EMPTY_SEVERITY_COUNTS,
      updatedIncidents: [],
      totalEventsReceived: 0,
      hasReceivedHistory: false,
    });
  }, [enabled, stopAllSubscriptions]);

  // Reconcile desired cells against active subscriptions.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const currentFilterKey = subscriptionFilterKey;
    const currentTruncated = subscriptionPlan?.truncated ?? false;
    const previousMeta = lastRefreshMetaRef.current;
    const refreshTriggers: string[] = [];
    if (previousMeta.filterKey !== currentFilterKey) {
      refreshTriggers.push('filter-key');
    }
    if (previousMeta.desiredCount !== desiredCells.length) {
      refreshTriggers.push('desired-cell-count');
    }
    if (previousMeta.truncated !== currentTruncated) {
      refreshTriggers.push('truncation-state');
    }

    const reconcilePlan = computeReconcilePlan({
      enabled,
      desiredCells,
      activeSubscriptionKeys: subscriptionRegistry.subscriptions.keys(),
    });

    if (
      DEBUG_CACHE &&
      (reconcilePlan.toAdd.length > 0 ||
        reconcilePlan.toRemove.length > 0 ||
        lastFilterKeyRef.current !== currentFilterKey)
    ) {
      const beforeCount = subscriptionRegistry.subscriptions.size;
      console.log(
        `🔁 [IncidentSub] Refresh trigger (${refreshTriggers.join(', ') || 'state-change'}) filter:${currentFilterKey} (desired:${desiredCells.length}, add:${reconcilePlan.toAdd.length}, remove:${reconcilePlan.toRemove.length}, truncated:${currentTruncated}, live before:${beforeCount})`
      );
      const expectedAfterCount = Math.max(
        0,
        Math.min(
          MAP_SUBSCRIPTION.MAX_ACTIVE_CELLS,
          beforeCount + reconcilePlan.toAdd.length - reconcilePlan.toRemove.length
        )
      );
      console.log(
        `🔁 [IncidentSub] Live subscriptions (before:${beforeCount}, expected-after:${expectedAfterCount})`
      );
    }
    lastFilterKeyRef.current = subscriptionFilterKey;
    lastRefreshMetaRef.current = {
      filterKey: currentFilterKey,
      desiredCount: desiredCells.length,
      truncated: currentTruncated,
    };

    for (const key of reconcilePlan.toRemove) {
      stopSubscription(key);
    }

    for (const key of reconcilePlan.toAdd) {
      startSubscription(key);
    }

    if (reconcilePlan.shouldPruneByCell) {
      const didPrune = pruneToDesiredGeohashes(reconcilePlan.desiredKeys);
      if (didPrune) {
        recomputeVisibleState([]);
      }
    }

    if (reconcilePlan.toAdd.length > 0 || reconcilePlan.toRemove.length > 0) {
      const afterCount = subscriptionRegistry.subscriptions.size;
      if (DEBUG_CACHE) {
        console.log(
          `🔁 [IncidentSub] Live subscriptions after refresh: ${afterCount}`
        );
      }

      setState((prev) => {
        const nextHasReceivedHistory = hasReceivedHistory();
        if (prev.hasReceivedHistory === nextHasReceivedHistory) {
          return prev;
        }

        return {
          ...prev,
          hasReceivedHistory: nextHasReceivedHistory,
        };
      });
    }
  }, [
    enabled,
    desiredCells,
    subscriptionFilterKey,
    subscriptionPlan?.truncated,
    startSubscription,
    stopSubscription,
    recomputeVisibleState,
    pruneToDesiredGeohashes,
    hasReceivedHistory,
  ]);

  // Resort existing incidents on location/max changes.
  useEffect(() => {
    if (!enabled) {
      return;
    }
    recomputeVisibleState([]);
  }, [enabled, locationKey, effectiveMaxIncidents, recomputeVisibleState]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pendingEventsRef.current = [];
      stopAllSubscriptions();
      subscriptionRegistry.clear();
    };
  }, [stopAllSubscriptions, subscriptionRegistry]);

  return {
    incidents: state.incidents,
    severityCounts: state.severityCounts,
    updatedIncidents: state.updatedIncidents,
    totalEventsReceived: state.totalEventsReceived,
    isInitialLoading: enabled ? !state.hasReceivedHistory : false,
    hasReceivedHistory: state.hasReceivedHistory,
    lastUpdatedAt: lastUpdatedRef.current,
  };
}
