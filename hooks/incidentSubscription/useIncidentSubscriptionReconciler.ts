import { useCallback, useEffect, useRef } from 'react';

import { calculateIncidentSinceUnixSeconds } from '@lib/incidentHistoryWindow';
import { computeReconcilePlan } from './reconcile';
import { buildIncidentDisplayState } from './sorting';
import {
  HISTORY_REFRESH_WATCHDOG_MS,
  logHistoryWindowDebugEvent,
  summarizeQueuedEventSources,
  type HistoryRefreshCompletionReason,
} from './useIncidentHistoryRefresh';
import {
  buildIncidentBackfillSubscriptionKey,
  buildIncidentBackfillWindows,
  resetIncidentBackfillRuntime,
} from './backfillWindows';
import type { SubscriptionController } from './useIncidentSubscriptionController';
import type { IncidentSubscriptionCoreState } from './useIncidentSubscriptionState';
import type { IncidentSubscriptionGroup, ProcessedIncident } from './types';

const DEBUG_CACHE =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_INCIDENT_SUBSCRIPTION === '1';

const DEFERRED_DESIRED_CELLS_PRUNE_WATCHDOG_MS = HISTORY_REFRESH_WATCHDOG_MS;

function getDisplayableIncidentCount({
  incidentMap,
  stableLocation,
  effectiveMaxIncidents,
  effectiveSinceDays,
}: {
  incidentMap: Map<string, ProcessedIncident>;
  stableLocation: [number, number] | null;
  effectiveMaxIncidents: number;
  effectiveSinceDays: number;
}): number {
  const cutoffUnixSeconds = calculateIncidentSinceUnixSeconds(effectiveSinceDays);
  return buildIncidentDisplayState({
    incidentMap,
    location: stableLocation,
    maxIncidents: effectiveMaxIncidents,
    minOccurredAtMs: cutoffUnixSeconds * 1000,
  }).incidents.length;
}

interface UseIncidentSubscriptionReconcilerArgs {
  enabled: boolean;
  desiredCells: string[];
  desiredSubscriptionGroups: IncidentSubscriptionGroup[];
  subscriptionFilterKey: string;
  subscriptionPlanTruncated: boolean;
  effectiveSinceDays: number;
  stableLocation: [number, number] | null;
  effectiveMaxIncidents: number;
  subscriptionState: IncidentSubscriptionCoreState;
  controller: Pick<
    SubscriptionController,
    | 'hasReceivedHistory'
    | 'recomputeVisibleStateWithRemovals'
    | 'flushQueuedEvents'
    | 'startSubscription'
    | 'startBackfillSubscription'
    | 'stopSubscription'
    | 'pruneToDesiredGeohashes'
    | 'clearQueuedEvents'
    | 'stopBackfillSubscription'
    | 'stopAllBackfillSubscriptions'
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
  desiredSubscriptionGroups,
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
  const pendingDesiredCellsPruneWatchdogRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    state,
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
    pendingDesiredCellsPruneRef,
    skippedHistoryRefreshKeysRef,
    historyBackfillRef,
  } = subscriptionState;
  const {
    hasReceivedHistory,
    recomputeVisibleStateWithRemovals,
    flushQueuedEvents,
    startSubscription,
    startBackfillSubscription,
    stopSubscription,
    pruneToDesiredGeohashes,
    clearQueuedEvents,
    stopBackfillSubscription,
    stopAllBackfillSubscriptions,
  } = controller;

  const clearPendingDesiredCellsPruneWatchdog = useCallback(() => {
    if (!pendingDesiredCellsPruneWatchdogRef.current) {
      return;
    }

    clearTimeout(pendingDesiredCellsPruneWatchdogRef.current);
    pendingDesiredCellsPruneWatchdogRef.current = null;
  }, []);

  useEffect(() => {
    if (pendingDesiredCellsPruneRef.current !== null) {
      return;
    }

    clearPendingDesiredCellsPruneWatchdog();
  }, [clearPendingDesiredCellsPruneWatchdog, pendingDesiredCellsPruneRef, state]);

  useEffect(() => {
    return () => {
      clearPendingDesiredCellsPruneWatchdog();
    };
  }, [clearPendingDesiredCellsPruneWatchdog]);

  useEffect(() => {
    if (!enabled) {
      clearPendingDesiredCellsPruneWatchdog();
      const runtime = historyBackfillRef.current;
      if (runtime.activeSubscriptions.size > 0 || runtime.planKey !== 'disabled') {
        stopAllBackfillSubscriptions(runtime.activeSubscriptions);
        resetIncidentBackfillRuntime({
          runtime,
          planKey: 'disabled',
          windows: [],
          stopReason: 'disabled',
        });
      }
      return;
    }

    const currentFilterKey = subscriptionFilterKey;
    const backfillPlanKey = `${currentFilterKey}|sinceDays:${effectiveSinceDays}`;
    const currentTruncated = subscriptionPlanTruncated;
    const previousMeta = lastRefreshMetaRef.current;
    const refreshTriggers: string[] = [];
    if (previousMeta.filterKey !== currentFilterKey) {
      refreshTriggers.push('filter-key');
    }
    if (previousMeta.desiredCount !== desiredSubscriptionGroups.length) {
      refreshTriggers.push('desired-subscription-count');
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
      desiredSubscriptionKeys: desiredSubscriptionGroups.map((group) => group.key),
      activeSubscriptionKeys: subscriptionRegistry.subscriptions.keys(),
    });
    if (historyWindowChanged) {
      reconcilePlan.toRemove = Array.from(subscriptionRegistry.subscriptions.keys());
      reconcilePlan.toAdd = desiredSubscriptionGroups.map((group) => group.key);
    }
    const sameCoverageFilterChanged =
      !historyWindowChanged &&
      previousMeta.filterKey !== 'disabled' &&
      previousMeta.filterKey !== currentFilterKey &&
      desiredSubscriptionGroups.length > 0 &&
      reconcilePlan.toAdd.length === 0 &&
      reconcilePlan.toRemove.length === 0;
    if (sameCoverageFilterChanged) {
      const desiredKeys = new Set(desiredSubscriptionGroups.map((group) => group.key));
      reconcilePlan.toRemove = Array.from(subscriptionRegistry.subscriptions.keys()).filter(
        (key) => desiredKeys.has(key)
      );
      reconcilePlan.toAdd = desiredSubscriptionGroups.map((group) => group.key);
      refreshTriggers.push('same-coverage-filter-refresh');
    }

    const backfillRuntime = historyBackfillRef.current;
    const backfillPlanChanged = backfillRuntime.planKey !== backfillPlanKey;
    if (backfillPlanChanged && backfillRuntime.activeSubscriptions.size > 0) {
      stopAllBackfillSubscriptions(backfillRuntime.activeSubscriptions);
    }
    if (backfillPlanChanged) {
      resetIncidentBackfillRuntime({
        runtime: backfillRuntime,
        planKey: backfillPlanKey,
        windows: buildIncidentBackfillWindows({ sinceDays: effectiveSinceDays }),
        stopReason: historyWindowChanged ? 'history-window-change' : 'coverage-change',
      });
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
      desiredCount: desiredSubscriptionGroups.length,
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
      pendingDesiredCellsPruneRef.current = null;
      clearPendingDesiredCellsPruneWatchdog();
      skippedHistoryRefreshKeysRef.current.clear();
      clearHistoryRefreshWatchdog();
      const refreshEpoch = refreshEpochRef.current + 1;
      refreshEpochRef.current = refreshEpoch;
      activeHistoryRefreshRef.current =
        desiredSubscriptionGroups.length > 0
          ? {
              epoch: refreshEpoch,
              expectedKeys: new Set(desiredSubscriptionGroups.map((group) => group.key)),
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
        desiredSubscriptionCount: desiredSubscriptionGroups.length,
        desiredGroupSizes: desiredSubscriptionGroups.map((group) => group.cells.length),
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

    if (desiredSubscriptionGroups.length === 0 && activeHistoryRefreshRef.current) {
      const { epoch, expectedKeys, satisfiedKeys } = activeHistoryRefreshRef.current;
      clearHistoryRefreshWatchdog();
      activeHistoryRefreshRef.current = null;
      logHistoryWindowDebugEvent('history-window refresh settled by zero desired cells', {
        epoch,
        expectedKeyCount: expectedKeys.size,
        satisfiedKeyCount: satisfiedKeys.size,
      });
    }

    const desiredSubscriptionGroupByKey = new Map(
      desiredSubscriptionGroups.map((group) => [group.key, group])
    );

    for (const key of reconcilePlan.toAdd) {
      const group = desiredSubscriptionGroupByKey.get(key);
      if (!group) {
        continue;
      }
      const activeRefreshEpoch =
        activeHistoryRefreshRef.current?.expectedKeys.has(key) === true
          ? activeHistoryRefreshRef.current.epoch
          : null;
      startSubscription(group, activeRefreshEpoch);
    }

    if (historyWindowChanged && bufferedQueuedEvents.length > 0) {
      pendingEventsRef.current.push(...bufferedQueuedEvents);
    }

    if (reconcilePlan.shouldPruneByCell) {
      const includesSkippedHistoryRefreshKey = desiredSubscriptionGroups.some((group) =>
        skippedHistoryRefreshKeysRef.current.has(group.key)
      );
      const shouldDeferMapPrune =
        !historyWindowChanged &&
        reconcilePlan.toAdd.length > 0 &&
        state.hasReceivedHistory &&
        !hasReceivedHistory() &&
        !includesSkippedHistoryRefreshKey;
      const hasPendingDesiredCellsPrune = pendingDesiredCellsPruneRef.current !== null;
      const shouldSkipImmediateMapPrune =
        shouldDeferMapPrune || hasPendingDesiredCellsPrune;

      if (shouldDeferMapPrune) {
        pendingDesiredCellsPruneRef.current = new Set(desiredCells);
        clearPendingDesiredCellsPruneWatchdog();
        pendingDesiredCellsPruneWatchdogRef.current = setTimeout(() => {
          pendingDesiredCellsPruneWatchdogRef.current = null;
          const pendingDesiredCells = pendingDesiredCellsPruneRef.current;
          if (!pendingDesiredCells) {
            return;
          }

          pendingDesiredCellsPruneRef.current = null;
          const removedIncidentIds = pruneToDesiredGeohashes(pendingDesiredCells);
          if (removedIncidentIds.length > 0) {
            recomputeVisibleStateWithRemovals([], removedIncidentIds);
          }
        }, DEFERRED_DESIRED_CELLS_PRUNE_WATCHDOG_MS);
        if (hasReceivedHistory()) {
          pendingDesiredCellsPruneRef.current = null;
          clearPendingDesiredCellsPruneWatchdog();
          const removedIncidentIds = pruneToDesiredGeohashes(new Set(desiredCells));
          if (removedIncidentIds.length > 0) {
            recomputeVisibleStateWithRemovals([], removedIncidentIds);
          }
          setState((prev) =>
            prev.hasReceivedHistory
              ? prev
              : {
                  ...prev,
                  hasReceivedHistory: true,
                }
          );
        }
      } else if (!hasPendingDesiredCellsPrune) {
        pendingDesiredCellsPruneRef.current = null;
        clearPendingDesiredCellsPruneWatchdog();
      }

      if (!shouldSkipImmediateMapPrune) {
        const removedIncidentIds = pruneToDesiredGeohashes(new Set(desiredCells));
        if (removedIncidentIds.length > 0) {
          recomputeVisibleStateWithRemovals([], removedIncidentIds);
        }
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

    const startNextBackfillWindow = () => {
      const runtime = historyBackfillRef.current;
      if (runtime.planKey !== backfillPlanKey || runtime.activeSubscriptions.size > 0) {
        return;
      }

      if (runtime.nextWindowIndex >= runtime.windows.length) {
        runtime.stopReason = 'complete';
        return;
      }

      const displayableIncidentCount = getDisplayableIncidentCount({
        incidentMap: incidentMapRef.current,
        stableLocation,
        effectiveMaxIncidents,
        effectiveSinceDays,
      });
      if (displayableIncidentCount >= effectiveMaxIncidents) {
        runtime.stopReason = 'capacity';
        return;
      }

      const historyWindow = runtime.windows[runtime.nextWindowIndex];
      const epoch = runtime.epoch;
      runtime.activeWindowIndex = historyWindow.index;
      runtime.stopReason = null;

      for (const group of desiredSubscriptionGroups) {
        const subscriptionKey = buildIncidentBackfillSubscriptionKey({
          epoch,
          groupKey: group.key,
          window: historyWindow,
        });
        const subscription = startBackfillSubscription(
          group,
          historyWindow,
          subscriptionKey,
          (completedSubscriptionKey) => {
            const currentRuntime = historyBackfillRef.current;
            if (
              currentRuntime.epoch !== epoch ||
              currentRuntime.planKey !== backfillPlanKey
            ) {
              return;
            }

            const activeSubscription =
              currentRuntime.activeSubscriptions.get(completedSubscriptionKey);
            if (activeSubscription) {
              stopBackfillSubscription(completedSubscriptionKey, activeSubscription);
              currentRuntime.activeSubscriptions.delete(completedSubscriptionKey);
            }

            if (
              currentRuntime.activeSubscriptions.size === 0 &&
              currentRuntime.activeWindowIndex === historyWindow.index
            ) {
              currentRuntime.activeWindowIndex = null;
              currentRuntime.nextWindowIndex = Math.max(
                currentRuntime.nextWindowIndex,
                historyWindow.index + 1
              );
              startNextBackfillWindow();
            }
          }
        );
        runtime.activeSubscriptions.set(subscriptionKey, subscription);
      }

      if (desiredSubscriptionGroups.length === 0) {
        runtime.activeWindowIndex = null;
        runtime.stopReason = 'empty-coverage';
      }
    };

    if (desiredSubscriptionGroups.length === 0) {
      if (backfillRuntime.activeSubscriptions.size > 0) {
        stopAllBackfillSubscriptions(backfillRuntime.activeSubscriptions);
      }
      resetIncidentBackfillRuntime({
        runtime: backfillRuntime,
        planKey: backfillPlanKey,
        windows: [],
        stopReason: 'empty-coverage',
      });
      return;
    }

    if (hasReceivedHistory()) {
      startNextBackfillWindow();
    }
  }, [
    enabled,
    desiredCells,
    desiredSubscriptionGroups,
    subscriptionFilterKey,
    subscriptionPlanTruncated,
    effectiveSinceDays,
    startSubscription,
    startBackfillSubscription,
    stopSubscription,
    stopBackfillSubscription,
    stopAllBackfillSubscriptions,
    recomputeVisibleStateWithRemovals,
    flushQueuedEvents,
    pruneToDesiredGeohashes,
    hasReceivedHistory,
    state.hasReceivedHistory,
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
    pendingDesiredCellsPruneRef,
    skippedHistoryRefreshKeysRef,
    historyBackfillRef,
    clearHistoryRefreshWatchdog,
    completeHistoryRefresh,
    clearPendingDesiredCellsPruneWatchdog,
  ]);
}
