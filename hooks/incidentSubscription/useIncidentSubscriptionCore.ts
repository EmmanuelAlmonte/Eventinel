/**
 * useIncidentSubscription Hook
 *
 * Coordinates incident subscriptions and cache/relay event queueing.
 */

import { useEffect } from 'react';

import { INCIDENT_LIMITS } from '@lib/map/constants';
import { EMPTY_SEVERITY_COUNTS, toProcessedIncident } from './sorting';
import { useIncidentHistoryRefresh } from './useIncidentHistoryRefresh';
import { useIncidentSubscriptionController } from './useIncidentSubscriptionController';
import { useIncidentSubscriptionPlan } from './useIncidentSubscriptionPlanner';
import { useIncidentSubscriptionReconciler } from './useIncidentSubscriptionReconciler';
import { useIncidentSubscriptionState } from './useIncidentSubscriptionState';
import type {
  UseIncidentSubscriptionOptions,
  UseIncidentSubscriptionResult,
} from './types';

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
    desiredSubscriptionGroups,
    subscriptionFilterKey,
    locationKey,
  } = useIncidentSubscriptionPlan({
    enabled,
    location,
    subscriptionLocation,
    subscriptionViewport,
  });

  const subscriptionState = useIncidentSubscriptionState();
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
    activeHistoryRefreshRef,
  } = subscriptionState;

  const {
    clearHistoryRefreshWatchdog,
    completeHistoryRefresh,
    markHistoryRefreshSatisfied,
  } = useIncidentHistoryRefresh({
    activeHistoryRefreshRef,
    refreshWatchdogTimerRef: subscriptionState.refreshWatchdogTimerRef,
    setState,
    subscriptionRegistry,
  });

  const controller = useIncidentSubscriptionController({
    enabled,
    desiredSubscriptionCount: desiredSubscriptionGroups.length,
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
  const {
    recomputeVisibleState,
    stopAllSubscriptions,
    clearQueuedEvents,
  } = controller;

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
    clearHistoryRefreshWatchdog,
  ]);

  useIncidentSubscriptionReconciler({
    enabled,
    desiredCells,
    desiredSubscriptionGroups,
    subscriptionFilterKey,
    subscriptionPlanTruncated: subscriptionPlan?.truncated ?? false,
    effectiveSinceDays,
    stableLocation,
    effectiveMaxIncidents,
    subscriptionState,
    controller,
    clearHistoryRefreshWatchdog,
    completeHistoryRefresh,
  });

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
