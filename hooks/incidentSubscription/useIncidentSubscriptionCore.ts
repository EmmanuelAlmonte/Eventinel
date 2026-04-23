/**
 * useIncidentSubscription Hook
 *
 * Coordinates incident subscriptions and cache/relay event queueing.
 */

import { useCallback, useEffect } from 'react';

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
  __DEV__ &&
  process.env.EXPO_PUBLIC_DEBUG_INCIDENT_HISTORY_WINDOW === '1' &&
  (globalThis as Record<string, unknown>).describe == null;
const HISTORY_REFRESH_WATCHDOG_MS = 6000;

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
    relayConfirmedIncidentIdsBySubscriptionKeyRef,
    lastUpdatedRef,
    lastTotalEventsRef,
    lastFilterKeyRef,
    pendingEventsRef,
    flushTimerRef,
    flushTimerDelayMsRef,
    subscriptionRegistry,
    lastRefreshMetaRef,
    refreshEpochRef,
    activeHistoryRefreshRef,
    refreshWatchdogTimerRef,
  } = useIncidentSubscriptionState();

  const clearHistoryRefreshWatchdog = useCallback(() => {
    if (refreshWatchdogTimerRef.current) {
      clearTimeout(refreshWatchdogTimerRef.current);
      refreshWatchdogTimerRef.current = null;
    }
  }, [refreshWatchdogTimerRef]);

  const completeHistoryRefresh = useCallback(
    (epoch: number, reason: 'complete' | 'watchdog') => {
      const activeHistoryRefresh = activeHistoryRefreshRef.current;
      if (!activeHistoryRefresh || activeHistoryRefresh.epoch !== epoch) {
        return;
      }

      const unsatisfiedKeys = Array.from(activeHistoryRefresh.expectedKeys).filter(
        (key) => !activeHistoryRefresh.satisfiedKeys.has(key)
      );
      const stillActiveUnsatisfiedKeys = unsatisfiedKeys.filter((key) =>
        subscriptionRegistry.subscriptions.has(key)
      );
      const removedUnsatisfiedKeys = unsatisfiedKeys.filter(
        (key) => !subscriptionRegistry.subscriptions.has(key)
      );

      for (const key of stillActiveUnsatisfiedKeys) {
        subscriptionRegistry.setHasReceivedHistory(key);
      }

      clearHistoryRefreshWatchdog();
      activeHistoryRefreshRef.current = null;

      logHistoryWindowDebugEvent('history-window refresh completed', {
        epoch,
        reason,
        expectedKeyCount: activeHistoryRefresh.expectedKeys.size,
        satisfiedKeyCount:
          activeHistoryRefresh.satisfiedKeys.size + stillActiveUnsatisfiedKeys.length,
        forcedUnsatisfiedKeys: stillActiveUnsatisfiedKeys,
        skippedRemovedKeys: removedUnsatisfiedKeys,
      });

      setState((prev) => {
        if (prev.hasReceivedHistory) {
          return prev;
        }

        return {
          ...prev,
          hasReceivedHistory: true,
        };
      });
    },
    [
      activeHistoryRefreshRef,
      clearHistoryRefreshWatchdog,
      setState,
      subscriptionRegistry,
    ]
  );

  const markHistoryRefreshSatisfied = useCallback(
    (key: string, epoch: number, source: 'cache' | 'eose') => {
      const activeHistoryRefresh = activeHistoryRefreshRef.current;
      if (!activeHistoryRefresh || activeHistoryRefresh.epoch !== epoch) {
        logHistoryWindowDebugEvent('history-window satisfaction ignored', {
          key,
          epoch,
          source,
          activeEpoch: activeHistoryRefresh?.epoch ?? null,
        });
        return;
      }

      if (!activeHistoryRefresh.expectedKeys.has(key)) {
        logHistoryWindowDebugEvent('history-window satisfaction unexpected key', {
          key,
          epoch,
          source,
        });
        return;
      }

      if (activeHistoryRefresh.satisfiedKeys.has(key)) {
        return;
      }

      activeHistoryRefresh.satisfiedKeys.add(key);
      activeHistoryRefresh.sawDataSignal =
        activeHistoryRefresh.sawDataSignal || source === 'cache';
      subscriptionRegistry.setHasReceivedHistory(key);

      logHistoryWindowDebugEvent('history-window satisfaction recorded', {
        key,
        epoch,
        source,
        satisfiedKeyCount: activeHistoryRefresh.satisfiedKeys.size,
        expectedKeyCount: activeHistoryRefresh.expectedKeys.size,
      });

      if (
        activeHistoryRefresh.satisfiedKeys.size >= activeHistoryRefresh.expectedKeys.size
      ) {
        completeHistoryRefresh(epoch, 'complete');
        return;
      }

      setState((prev) =>
        prev.hasReceivedHistory
          ? {
              ...prev,
              hasReceivedHistory: false,
            }
          : prev
      );
    },
    [
      activeHistoryRefreshRef,
      completeHistoryRefresh,
      setState,
      subscriptionRegistry,
    ]
  );

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
    relayConfirmedIncidentIdsBySubscriptionKeyRef,
    pendingEventsRef,
    flushTimerRef,
    flushTimerDelayMsRef,
    lastUpdatedRef,
    lastTotalEventsRef,
    setState,
    subscriptionRegistry,
    activeHistoryRefreshRef,
    markHistoryRefreshSatisfied,
  });

  // Handle enabled/disabled lifecycle.
  useEffect(() => {
    if (enabled) {
      return;
    }

    clearQueuedEvents();
    stopAllSubscriptions();
    clearHistoryRefreshWatchdog();
    activeHistoryRefreshRef.current = null;

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
        removedIncidentIds: [],
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
    refreshWatchdogTimerRef,
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
    const historyWindowChanged =
      previousMeta.filterKey !== 'disabled' &&
      previousMeta.sinceDays !== effectiveSinceDays;
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
      clearHistoryRefreshWatchdog();
      const refreshEpoch = refreshEpochRef.current + 1;
      refreshEpochRef.current = refreshEpoch;
      activeHistoryRefreshRef.current =
        desiredCells.length > 0
          ? {
              epoch: refreshEpoch,
              expectedKeys: new Set(desiredCells),
              satisfiedKeys: new Set(),
              sawDataSignal: false,
            }
          : null;

      if (activeHistoryRefreshRef.current) {
        const currentEpoch = refreshEpoch;
        refreshWatchdogTimerRef.current = setTimeout(() => {
          completeHistoryRefresh(currentEpoch, 'watchdog');
        }, HISTORY_REFRESH_WATCHDOG_MS);
      }

      const pendingBeforeFilterCount = pendingEventsRef.current.length;
      const filteredBufferedCount = bufferedQueuedEvents.length;
      logHistoryWindowDebugEvent('history-window refresh planned', {
        epoch: activeHistoryRefreshRef.current?.epoch ?? null,
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
        removedIncidentIds: [],
        totalEventsReceived: 0,
        hasReceivedHistory: false,
      });
    }

    for (const key of reconcilePlan.toRemove) {
      stopSubscription(key);
    }

    for (const key of reconcilePlan.toAdd) {
      const activeRefreshEpoch =
        activeHistoryRefreshRef.current?.expectedKeys.has(key) === true
          ? activeHistoryRefreshRef.current.epoch
          : null;
      startSubscription(key, activeRefreshEpoch);
    }

    if (historyWindowChanged && bufferedQueuedEvents.length > 0) {
      pendingEventsRef.current.push(...bufferedQueuedEvents);
    }

    if (reconcilePlan.shouldPruneByCell) {
      const didPrune = pruneToDesiredGeohashes(reconcilePlan.desiredKeys);
      if (didPrune) {
        recomputeVisibleState([]);
      }
    }

    // Initial CACHE_FIRST callbacks already schedule a flush. Only force buffered
    // replay work when a history-window change cleared and rebuilt the queue.
    if (pendingEventsRef.current.length > 0 && historyWindowChanged) {
      flushQueuedEvents();
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
    refreshEpochRef,
    activeHistoryRefreshRef,
    refreshWatchdogTimerRef,
    clearHistoryRefreshWatchdog,
    completeHistoryRefresh,
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
      clearHistoryRefreshWatchdog();
      activeHistoryRefreshRef.current = null;
      subscriptionRegistry.clear();
    };
  }, [
    activeHistoryRefreshRef,
    clearHistoryRefreshWatchdog,
    clearQueuedEvents,
    stopAllSubscriptions,
    subscriptionRegistry,
  ]);

  return {
    incidents: state.incidents,
    severityCounts: state.severityCounts,
    updatedIncidents: state.updatedIncidents,
    removedIncidentIds: state.removedIncidentIds,
    totalEventsReceived: state.totalEventsReceived,
    isInitialLoading: enabled ? !state.hasReceivedHistory : false,
    hasReceivedHistory: state.hasReceivedHistory,
    lastUpdatedAt: lastUpdatedRef.current,
  };
}
