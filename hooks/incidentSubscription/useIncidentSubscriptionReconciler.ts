import { useEffect } from 'react';

import { calculateIncidentSinceUnixSeconds } from '@lib/incidentHistoryWindow';
import { computeReconcilePlan } from './reconcile';
import { buildIncidentDisplayState } from './sorting';
import {
  HISTORY_REFRESH_WATCHDOG_MS,
  logHistoryWindowDebugEvent,
  summarizeQueuedEventSources,
  type HistoryRefreshCompletionReason,
} from './useIncidentHistoryRefresh';
import type { SubscriptionController } from './useIncidentSubscriptionController';
import type { IncidentSubscriptionCoreState } from './useIncidentSubscriptionState';
import type { ProcessedIncident } from './types';

const DEBUG_CACHE =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_INCIDENT_SUBSCRIPTION === '1';

interface UseIncidentSubscriptionReconcilerArgs {
  enabled: boolean;
  desiredCells: string[];
  subscriptionFilterKey: string;
  subscriptionPlanTruncated: boolean;
  effectiveSinceDays: number;
  stableLocation: [number, number] | null;
  effectiveMaxIncidents: number;
  subscriptionState: IncidentSubscriptionCoreState;
  controller: Pick<
    SubscriptionController,
    | 'hasReceivedHistory'
    | 'recomputeVisibleState'
    | 'flushQueuedEvents'
    | 'startSubscription'
    | 'stopSubscription'
    | 'pruneToDesiredGeohashes'
    | 'clearQueuedEvents'
  >;
  clearHistoryRefreshWatchdog: () => void;
  completeHistoryRefresh: (
    epoch: number,
    reason: HistoryRefreshCompletionReason
  ) => void;
}

export function useIncidentSubscriptionReconciler({
  enabled,
  desiredCells,
  subscriptionFilterKey,
  subscriptionPlanTruncated,
  effectiveSinceDays,
  stableLocation,
  effectiveMaxIncidents,
  subscriptionState,
  controller,
  clearHistoryRefreshWatchdog,
  completeHistoryRefresh,
}: UseIncidentSubscriptionReconcilerArgs) {
  const {
    setState,
    incidentMapRef,
    lastFilterKeyRef,
    pendingEventsRef,
    lastTotalEventsRef,
    subscriptionRegistry,
    lastRefreshMetaRef,
    refreshEpochRef,
    activeHistoryRefreshRef,
    refreshWatchdogTimerRef,
  } = subscriptionState;
  const {
    hasReceivedHistory,
    recomputeVisibleState,
    flushQueuedEvents,
    startSubscription,
    stopSubscription,
    pruneToDesiredGeohashes,
    clearQueuedEvents,
  } = controller;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const currentFilterKey = subscriptionFilterKey;
    const currentTruncated = subscriptionPlanTruncated;
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
    subscriptionPlanTruncated,
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
    lastTotalEventsRef,
    refreshEpochRef,
    activeHistoryRefreshRef,
    refreshWatchdogTimerRef,
    clearHistoryRefreshWatchdog,
    completeHistoryRefresh,
  ]);
}
