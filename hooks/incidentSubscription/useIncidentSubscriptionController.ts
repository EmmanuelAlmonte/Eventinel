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

function getHasReceivedHistory({
  enabled,
  desiredSubscriptionCount,
  subscriptionRegistry,
}: {
  enabled: boolean;
  desiredSubscriptionCount: number;
  subscriptionRegistry: RegistryLike;
}): boolean {
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
    return getHasReceivedHistory({
      enabled,
      desiredSubscriptionCount,
      subscriptionRegistry,
    });
  }, [enabled, desiredSubscriptionCount, subscriptionRegistry]);

  const { recomputeVisibleState, flushQueuedEvents, enqueueEvents, clearQueuedEvents } =
    useIncidentSubscriptionStateSyncController({
      enabled,
      stableLocation,
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
      setState,
      incidentMapRef,
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
