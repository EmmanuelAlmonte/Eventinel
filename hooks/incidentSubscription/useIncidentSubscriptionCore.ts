/**
 * useIncidentSubscription Hook
 *
 * Coordinates incident subscriptions and cache/relay event queueing.
 */

import { useEffect } from 'react';

import { calculateIncidentSinceUnixSeconds } from '@lib/incidentHistoryWindow';
import { INCIDENT_LIMITS } from '@lib/map/constants';
import { computeReconcilePlan } from './reconcile';
import { buildIncidentDisplayState, EMPTY_SEVERITY_COUNTS, toProcessedIncident } from './sorting';
import { useIncidentSubscriptionController } from './useIncidentSubscriptionController';
import { useIncidentSubscriptionPlan } from './useIncidentSubscriptionPlanner';
import { useIncidentSubscriptionState } from './useIncidentSubscriptionState';
import type {
  ProcessedIncident,
  UseIncidentSubscriptionOptions,
  UseIncidentSubscriptionResult,
} from './types';

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

function summarizeQueuedEventSources(
  queuedEvents: readonly { source: 'cache' | 'relay' }[]
) {
  return queuedEvents.reduce(
    (summary, queued) => {
      summary[queued.source] += 1;
      return summary;
    },
    { cache: 0, relay: 0 }
  );
}

export type {
  ProcessedIncident,
  UseIncidentSubscriptionOptions,
  UseIncidentSubscriptionResult,
} from './types';
export { toProcessedIncident };

export function useIncidentSubscription({
  location,
  subscriptionLocation,
  subscriptionViewport,
  enabled = true,
  maxIncidents = INCIDENT_LIMITS.MAX_VISIBLE,
  sinceDays = INCIDENT_LIMITS.SINCE_DAYS,
}: UseIncidentSubscriptionOptions): UseIncidentSubscriptionResult {
  const hasLocation = location !== null;
  const effectiveMaxIncidents = Math.min(maxIncidents, INCIDENT_LIMITS.MAX_VISIBLE);
  const effectiveSinceDays =
    Number.isFinite(sinceDays) && sinceDays > 0
      ? Math.floor(sinceDays)
      : INCIDENT_LIMITS.SINCE_DAYS;
  const {
    stableLocation,
    subscriptionPlan,
    desiredCells,
    subscriptionFilterKey,
    locationKey,
  } = useIncidentSubscriptionPlan({
    enabled,
    location,
    subscriptionLocation,
    subscriptionViewport,
  });

  const {
    state,
    setState,
    incidentMapRef,
    lastUpdatedRef,
    lastTotalEventsRef,
    lastFilterKeyRef,
    pendingEventsRef,
    flushTimerRef,
    subscriptionRegistry,
    lastRefreshMetaRef,
  } = useIncidentSubscriptionState();

  const {
    hasReceivedHistory,
    recomputeVisibleState,
    flushQueuedEvents,
    startSubscription,
    stopSubscription,
    stopAllSubscriptions,
    pruneToDesiredGeohashes,
    clearQueuedEvents,
  } = useIncidentSubscriptionController({
    enabled,
    desiredSubscriptionCount: desiredCells.length,
    stableLocation,
    sinceDays: effectiveSinceDays,
    effectiveMaxIncidents,
    incidentMapRef,
    pendingEventsRef,
    flushTimerRef,
    lastUpdatedRef,
    lastTotalEventsRef,
    setState,
    subscriptionRegistry,
  });

  // Handle enabled/disabled lifecycle.
  useEffect(() => {
    if (enabled) {
      return;
    }

    clearQueuedEvents();
    stopAllSubscriptions();

    // Preserve last-known incidents during transient disables (navigation focus/app inactive)
    // to avoid a 2-3s empty-map flash while subscriptions restart. Hard-clear only when the
    // app has no location (true session-end condition we can detect locally).
    if (!hasLocation) {
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
    }
  }, [
    clearQueuedEvents,
    enabled,
    hasLocation,
    incidentMapRef,
    lastFilterKeyRef,
    lastTotalEventsRef,
    lastUpdatedRef,
    setState,
    stopAllSubscriptions,
  ]);

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
    const historyWindowChanged = previousMeta.sinceDays !== effectiveSinceDays;
    if (historyWindowChanged) {
      refreshTriggers.push('history-window');
    }

    const reconcilePlan = computeReconcilePlan({
      enabled,
      desiredCells,
      activeSubscriptionKeys: subscriptionRegistry.subscriptions.keys(),
    });
    if (historyWindowChanged) {
      reconcilePlan.toRemove = Array.from(subscriptionRegistry.subscriptions.keys());
      reconcilePlan.toAdd = [...desiredCells];
    }

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
        beforeCount + reconcilePlan.toAdd.length - reconcilePlan.toRemove.length
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
      sinceDays: effectiveSinceDays,
    };

    const replayCutoff = historyWindowChanged
      ? calculateIncidentSinceUnixSeconds(effectiveSinceDays)
      : null;
    const preservedIncidentMap =
      historyWindowChanged && replayCutoff != null
        ? new Map(
            Array.from(incidentMapRef.current.entries()).filter(([, incident]) => {
              return incident.occurredAtMs >= replayCutoff * 1000;
            })
          )
        : null;
    const bufferedQueuedEvents =
      historyWindowChanged && replayCutoff != null
        ? pendingEventsRef.current.filter(({ event }) => {
            const createdAt = event.created_at;
            return (
              typeof createdAt === 'number' &&
              Number.isFinite(createdAt) &&
              createdAt >= replayCutoff
            );
          })
        : [];

    if (historyWindowChanged) {
      const pendingBeforeFilterCount = pendingEventsRef.current.length;
      const filteredBufferedCount = bufferedQueuedEvents.length;
      logHistoryWindowDebugEvent('history-window refresh planned', {
        fromDays: previousMeta.sinceDays,
        toDays: effectiveSinceDays,
        refreshTriggers,
        replayCutoff,
        visibleIncidentCountBeforeClear: incidentMapRef.current.size,
        preservedIncidentCount: preservedIncidentMap?.size ?? 0,
        pendingBeforeFilterCount,
        pendingSourceCounts: summarizeQueuedEventSources(pendingEventsRef.current),
        bufferedAfterCutoffCount: filteredBufferedCount,
        droppedBufferedCount: Math.max(
          0,
          pendingBeforeFilterCount - filteredBufferedCount
        ),
        bufferedSourceCounts: summarizeQueuedEventSources(bufferedQueuedEvents),
        desiredCellCount: desiredCells.length,
        toAddCount: reconcilePlan.toAdd.length,
        toRemoveCount: reconcilePlan.toRemove.length,
      });
    }

    if (historyWindowChanged) {
      clearQueuedEvents();
      incidentMapRef.current = preservedIncidentMap ?? new Map<string, ProcessedIncident>();
      lastTotalEventsRef.current = 0;
      const { incidents, severityCounts } = buildIncidentDisplayState({
        incidentMap: incidentMapRef.current,
        location: stableLocation,
        maxIncidents: effectiveMaxIncidents,
        minOccurredAtMs:
          replayCutoff != null && Number.isFinite(replayCutoff)
            ? replayCutoff * 1000
            : null,
      });
      setState({
        incidents,
        severityCounts,
        updatedIncidents: [],
        totalEventsReceived: 0,
        hasReceivedHistory: false,
      });
    }

    for (const key of reconcilePlan.toRemove) {
      stopSubscription(key);
    }

    for (const key of reconcilePlan.toAdd) {
      startSubscription(key);
    }

    if (historyWindowChanged && bufferedQueuedEvents.length > 0) {
      pendingEventsRef.current.push(...bufferedQueuedEvents);
    }

    if (historyWindowChanged && pendingEventsRef.current.length > 0) {
      flushQueuedEvents();
    }

    if (reconcilePlan.shouldPruneByCell) {
      const didPrune = pruneToDesiredGeohashes(reconcilePlan.desiredKeys);
      if (didPrune) {
        recomputeVisibleState([]);
      }
    }

    if (
      historyWindowChanged ||
      reconcilePlan.toAdd.length > 0 ||
      reconcilePlan.toRemove.length > 0
    ) {
      const afterCount = subscriptionRegistry.subscriptions.size;
      if (DEBUG_CACHE) {
        console.log(`🔁 [IncidentSub] Live subscriptions after refresh: ${afterCount}`);
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
    effectiveSinceDays,
    startSubscription,
    stopSubscription,
    recomputeVisibleState,
    flushQueuedEvents,
    pruneToDesiredGeohashes,
    hasReceivedHistory,
    setState,
    subscriptionRegistry,
    lastRefreshMetaRef,
    lastFilterKeyRef,
    clearQueuedEvents,
    incidentMapRef,
    lastUpdatedRef,
    lastTotalEventsRef,
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
      clearQueuedEvents();
      stopAllSubscriptions();
      subscriptionRegistry.clear();
    };
  }, [clearQueuedEvents, stopAllSubscriptions, subscriptionRegistry]);

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
