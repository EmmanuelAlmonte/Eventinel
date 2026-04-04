import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  type NDKEvent,
  NDKSubscription,
} from '@nostr-dev-kit/mobile';

import { computeHasReceivedHistory } from './reconcile';
import { useIncidentSubscriptionPlannerController } from './subscriptionPlannerController';
import { useIncidentSubscriptionStateSyncController } from './subscriptionStateSyncController';
import {
  type HistoryRefreshProgress,
  type IncidentSubscriptionDisplayState,
  type IncomingEventSource,
  type QueuedEvent,
  type ProcessedIncident,
} from './types';

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
  pendingEventsRef: MutableRefObject<QueuedEvent[]>;
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  lastUpdatedRef: MutableRefObject<number | null>;
  lastTotalEventsRef: MutableRefObject<number>;
  setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
  subscriptionRegistry: RegistryLike;
  activeHistoryRefreshRef: MutableRefObject<HistoryRefreshProgress | null>;
  markHistoryRefreshSatisfied: (
    key: string,
    epoch: number,
    source: 'cache' | 'eose'
  ) => void;
}

export interface SubscriptionController {
  hasReceivedHistory: () => boolean;
  recomputeVisibleState: (updatedIncidents?: ProcessedIncident[]) => void;
  flushQueuedEvents: () => void;
  enqueueEvents: (events: NDKEvent[], source: IncomingEventSource) => void;
  startSubscription: (key: string, historyRefreshEpoch?: number | null) => void;
  stopSubscription: (key: string) => void;
  stopAllSubscriptions: () => void;
  pruneToDesiredGeohashes: (desiredKeys: Set<string>) => boolean;
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
  pendingEventsRef,
  flushTimerRef,
  lastUpdatedRef,
  lastTotalEventsRef,
  setState,
  subscriptionRegistry,
  activeHistoryRefreshRef,
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

  const { recomputeVisibleState, flushQueuedEvents, enqueueEvents, clearQueuedEvents } =
    useIncidentSubscriptionStateSyncController({
      enabled,
      stableLocation,
      sinceDays,
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
      markHistoryRefreshSatisfied,
      setState,
      incidentMapRef,
      sinceDays,
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
