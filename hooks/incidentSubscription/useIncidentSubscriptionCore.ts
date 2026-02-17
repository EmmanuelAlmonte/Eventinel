/**
 * useIncidentSubscription Hook
 *
 * Coordinates incident subscriptions and cache/relay event queueing.
 */

import { useEffect } from 'react';

import { INCIDENT_LIMITS } from '@lib/map/constants';
import { computeReconcilePlan } from './reconcile';
import { EMPTY_SEVERITY_COUNTS, toProcessedIncident } from './sorting';
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
}: UseIncidentSubscriptionOptions): UseIncidentSubscriptionResult {
  const effectiveMaxIncidents = Math.min(maxIncidents, INCIDENT_LIMITS.MAX_VISIBLE);
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
    startSubscription,
    stopSubscription,
    stopAllSubscriptions,
    pruneToDesiredGeohashes,
    clearQueuedEvents,
  } = useIncidentSubscriptionController({
    enabled,
    desiredSubscriptionCount: desiredCells.length,
    stableLocation,
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
  }, [
    clearQueuedEvents,
    enabled,
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
    startSubscription,
    stopSubscription,
    recomputeVisibleState,
    pruneToDesiredGeohashes,
    hasReceivedHistory,
    setState,
    subscriptionRegistry,
    lastRefreshMetaRef,
    lastFilterKeyRef,
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
