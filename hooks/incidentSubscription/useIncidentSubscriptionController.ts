import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  type NDKEvent,
  NDKSubscription,
} from '@nostr-dev-kit/mobile';

import { computeHasReceivedHistory } from './reconcile';
import { useIncidentSubscriptionPlannerController } from './subscriptionPlannerController';
import { useIncidentSubscriptionStateSyncController } from './subscriptionStateSyncController';
import {
  type RelayConfirmationMapRef,
  type PruneUnconfirmedIncidentOptions,
  pruneUnconfirmedIncidentsForSubscription,
} from './cacheConfirmation';
import {
  type HistoryRefreshProgress,
  type IncidentSubscriptionGroup,
  type IncidentSubscriptionDisplayState,
  type IncomingEventSource,
  type QueuedEvent,
  type ProcessedIncident,
} from './types';
import type { IncidentBackfillWindow } from './backfillWindows';

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
  sinceDays: number;
  effectiveMaxIncidents: number;
  incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef;
  pendingEventsRef: MutableRefObject<QueuedEvent[]>;
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  flushTimerDelayMsRef: MutableRefObject<number | null>;
  lastUpdatedRef: MutableRefObject<number | null>;
  lastTotalEventsRef: MutableRefObject<number>;
  setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
  subscriptionRegistry: RegistryLike;
  activeHistoryRefreshRef: MutableRefObject<HistoryRefreshProgress | null>;
  pendingDesiredCellsPruneRef: MutableRefObject<Set<string> | null>;
  skippedHistoryRefreshKeysRef: MutableRefObject<Set<string>>;
  markHistoryRefreshSatisfied: (
    key: string,
    epoch: number,
    source: 'cache' | 'eose'
  ) => void;
}

export interface SubscriptionController {
  hasReceivedHistory: () => boolean;
  recomputeVisibleState: (updatedIncidents?: ProcessedIncident[]) => void;
  recomputeVisibleStateWithRemovals: (
    updatedIncidents?: ProcessedIncident[],
    removedIncidentIds?: string[]
  ) => void;
  flushQueuedEvents: () => void;
  enqueueEvents: (
    events: NDKEvent[],
    source: IncomingEventSource,
    subscriptionKey?: string
  ) => void;
  startSubscription: (
    group: IncidentSubscriptionGroup,
    historyRefreshEpoch?: number | null
  ) => void;
  startBackfillSubscription: (
    group: IncidentSubscriptionGroup,
    historyWindow: IncidentBackfillWindow,
    subscriptionKey: string,
    onEose: (subscriptionKey: string) => void
  ) => NDKSubscription;
  stopSubscription: (key: string) => void;
  stopAllSubscriptions: () => void;
  stopBackfillSubscription: (key: string, subscription: NDKSubscription) => void;
  stopAllBackfillSubscriptions: (subscriptions: Map<string, NDKSubscription>) => void;
  pruneToDesiredGeohashes: (desiredKeys: Set<string>) => string[];
  clearQueuedEvents: () => void;
}

function getHasReceivedHistory({
  enabled,
  desiredSubscriptionCount,
  subscriptionRegistry,
  activeHistoryRefreshRef,
}: {
  enabled: boolean;
  desiredSubscriptionCount: number;
  subscriptionRegistry: RegistryLike;
  activeHistoryRefreshRef: MutableRefObject<HistoryRefreshProgress | null>;
}): boolean {
  if (desiredSubscriptionCount === 0) {
    return computeHasReceivedHistory(
      enabled,
      subscriptionRegistry.subscriptions.keys(),
      subscriptionRegistry.eoseBySubscriptionKey,
      desiredSubscriptionCount
    );
  }

  const activeHistoryRefresh = activeHistoryRefreshRef.current;
  if (activeHistoryRefresh) {
    return (
      activeHistoryRefresh.expectedKeys.size === 0 ||
      activeHistoryRefresh.satisfiedKeys.size >= activeHistoryRefresh.expectedKeys.size
    );
  }

  return computeHasReceivedHistory(
    enabled,
    subscriptionRegistry.subscriptions.keys(),
    subscriptionRegistry.eoseBySubscriptionKey,
    desiredSubscriptionCount
  );
}

export function useIncidentSubscriptionController({
  enabled,
  desiredSubscriptionCount,
  stableLocation,
  sinceDays,
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
  pendingDesiredCellsPruneRef,
  skippedHistoryRefreshKeysRef,
  markHistoryRefreshSatisfied,
}: SubscriptionControllerArgs): SubscriptionController {
  const hasReceivedHistory = useCallback(() => {
    return getHasReceivedHistory({
      enabled,
      desiredSubscriptionCount,
      subscriptionRegistry,
      activeHistoryRefreshRef,
    });
  }, [enabled, desiredSubscriptionCount, subscriptionRegistry, activeHistoryRefreshRef]);

  const {
    recomputeVisibleState,
    recomputeVisibleStateWithRemovals,
    flushQueuedEvents,
    enqueueEvents,
    clearQueuedEvents,
  } = useIncidentSubscriptionStateSyncController({
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
    });

  const lastRemovedIncidentIdsRef = useRef<string[]>([]);
  const hasPendingRemovedIncidentIdsSurfaceRef = useRef(false);

  useEffect(() => {
    if (!hasPendingRemovedIncidentIdsSurfaceRef.current) {
      return;
    }

    hasPendingRemovedIncidentIdsSurfaceRef.current = false;
    lastRemovedIncidentIdsRef.current = [];
  });

  const setHasReceivedHistoryState = useCallback((removedIncidentIds: string[] = []) => {
    if (removedIncidentIds.length > 0) {
      lastRemovedIncidentIdsRef.current = removedIncidentIds;
      hasPendingRemovedIncidentIdsSurfaceRef.current = true;
    }

    const nextRemovedIncidentIds =
      removedIncidentIds.length > 0
        ? removedIncidentIds
        : lastRemovedIncidentIdsRef.current;

    setState((prev) => ({
      ...prev,
      removedIncidentIds: nextRemovedIncidentIds,
      hasReceivedHistory: hasReceivedHistory(),
    }));
  }, [hasReceivedHistory, setState]);

  const {
    startSubscription,
    stopSubscription,
    stopAllSubscriptions,
    startBackfillSubscription,
    stopBackfillSubscription,
    stopAllBackfillSubscriptions,
    pruneToDesiredGeohashes,
  } = useIncidentSubscriptionPlannerController({
      subscriptionRegistry,
      enqueueEvents,
      flushQueuedEvents,
      recomputeVisibleStateWithRemovals,
      markHistoryRefreshSatisfied,
      setHasReceivedHistoryState,
      hasReceivedHistory,
      incidentMapRef,
      pendingDesiredCellsPruneRef,
      skippedHistoryRefreshKeysRef,
      pruneUnconfirmedIncidentsForSubscription: (
        subscriptionKey,
        options?: PruneUnconfirmedIncidentOptions
      ) =>
        pruneUnconfirmedIncidentsForSubscription({
          incidentMapRef,
          relayConfirmedIncidentIdsBySubscriptionKeyRef,
          subscriptionKey,
          ...options,
        }),
      relayConfirmedIncidentIdsBySubscriptionKeyRef,
      sinceDays,
    });

  return {
    hasReceivedHistory,
    recomputeVisibleState,
    recomputeVisibleStateWithRemovals,
    flushQueuedEvents,
    enqueueEvents,
    startSubscription,
    startBackfillSubscription,
    stopSubscription,
    stopAllSubscriptions,
    stopBackfillSubscription,
    stopAllBackfillSubscriptions,
    pruneToDesiredGeohashes,
    clearQueuedEvents,
  };
}
