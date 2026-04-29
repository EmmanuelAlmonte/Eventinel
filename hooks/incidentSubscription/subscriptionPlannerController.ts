import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import {
  NDKFilter,
  NDKSubscription,
  NDKSubscriptionCacheUsage,
  type NDKEvent,
} from '@nostr-dev-kit/mobile';

import { MAP_SUBSCRIPTION } from '@lib/map/constants';
import { INCIDENT_LIMITS } from '@lib/map/constants';
import { calculateIncidentSinceUnixSeconds } from '@lib/incidentHistoryWindow';
import { ndk } from '@lib/ndk';
import {
  clearRelayConfirmations,
  deleteRelayConfirmationsForSubscription,
  resetRelayConfirmationsForSubscription,
  type RelayConfirmationMapRef,
} from './cacheConfirmation';
import { pruneIncidentsByDesiredCells } from './reconcile';
import type {
  IncomingEventSource,
  ProcessedIncident,
} from './types';

// Keep subscription logs dev-only and opt-in to reduce noise during normal local runs.
const DEBUG_CACHE =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_INCIDENT_SUBSCRIPTION === '1';

type RegistryLike = {
  subscriptions: Map<string, NDKSubscription>;
  eoseBySubscriptionKey: Map<string, boolean>;
  start: (key: string, subscription: NDKSubscription) => void;
  stop: (key: string) => void;
  stopAll: () => void;
  setHasReceivedHistory: (key: string) => void;
};

function createIncidentSubscriptionFilter(key: string, sinceDays: number): NDKFilter {
  return {
    kinds: [30911 as number],
    '#g': [key],
    limit: INCIDENT_LIMITS.FETCH_LIMIT,
    since: calculateIncidentSinceUnixSeconds(sinceDays),
  };
}

function startIncidentSubscription(
  key: string,
  args: {
    subscriptionRegistry: RegistryLike;
    enqueueEvents: (
      events: NDKEvent[],
      source: IncomingEventSource,
      subscriptionKey?: string
    ) => void;
    flushQueuedEvents: () => void;
    recomputeVisibleStateWithRemovals: (
      updatedIncidents?: ProcessedIncident[],
      removedIncidentIds?: string[]
    ) => void;
    markHistoryRefreshSatisfied: (
      key: string,
      epoch: number,
      source: 'cache' | 'eose'
    ) => void;
    setHasReceivedHistoryState: () => void;
    sinceDays: number;
    relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef;
    pruneUnconfirmedIncidentsForSubscription: (subscriptionKey: string) => string[];
    historyRefreshEpoch?: number | null;
  }
): void {
  const beforeCount = args.subscriptionRegistry.subscriptions.size;
  if (DEBUG_CACHE) {
    console.log(
      `🔔 [IncidentSub] Start requested for key ${key} (live before:${beforeCount})`
      );
  }

  resetRelayConfirmationsForSubscription(
    args.relayConfirmedIncidentIdsBySubscriptionKeyRef,
    key
  );

  const subscription = ndk.subscribe([createIncidentSubscriptionFilter(key, args.sinceDays)], {
    closeOnEose: false,
    cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    groupable: false,
    onEvents: (events) => {
      if (
        args.historyRefreshEpoch != null &&
        Array.isArray(events) &&
        events.length > 0
      ) {
        args.markHistoryRefreshSatisfied(key, args.historyRefreshEpoch, 'cache');
      }
      args.enqueueEvents(events, 'cache', key);
    },
    onEvent: (event) => {
      args.enqueueEvents([event], 'relay', key);
    },
    onEose: () => {
      args.flushQueuedEvents();
      const removedIncidentIds = args.pruneUnconfirmedIncidentsForSubscription(key);
      if (args.historyRefreshEpoch != null) {
        args.markHistoryRefreshSatisfied(key, args.historyRefreshEpoch, 'eose');
        if (removedIncidentIds.length > 0) {
          args.recomputeVisibleStateWithRemovals([], removedIncidentIds);
        }
        return;
      }

      args.subscriptionRegistry.setHasReceivedHistory(key);
      if (removedIncidentIds.length > 0) {
        args.recomputeVisibleStateWithRemovals([], removedIncidentIds);
        return;
      }
      args.setHasReceivedHistoryState();
    },
  });

  args.subscriptionRegistry.start(key, subscription);
  if (DEBUG_CACHE) {
    const afterCount = args.subscriptionRegistry.subscriptions.size;
    console.log(`✅ [IncidentSub] Subscribed key ${key} (live after:${afterCount})`);
  }
}

function stopIncidentSubscription(
  key: string,
  subscriptionRegistry: RegistryLike,
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef
): void {
  const beforeCount = subscriptionRegistry.subscriptions.size;
  if (DEBUG_CACHE && subscriptionRegistry.subscriptions.has(key)) {
    console.log(
      `🛑 [IncidentSub] Stop requested for key ${key} (live before:${beforeCount})`
    );
  }

  subscriptionRegistry.stop(key);
  deleteRelayConfirmationsForSubscription(
    relayConfirmedIncidentIdsBySubscriptionKeyRef,
    key
  );

  if (DEBUG_CACHE) {
    const afterCount = subscriptionRegistry.subscriptions.size;
    if (beforeCount !== afterCount) {
      console.log(`🛑 [IncidentSub] Stopped key ${key} (live after:${afterCount})`);
    }
  }
}

function stopAllIncidentSubscriptions(
  subscriptionRegistry: RegistryLike,
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef
): void {
  if (DEBUG_CACHE) {
    const beforeCount = subscriptionRegistry.subscriptions.size;
    if (beforeCount > 0) {
      console.log(`🧹 [IncidentSub] stopAll requested (live before:${beforeCount})`);
    }
  }

  subscriptionRegistry.stopAll();
  clearRelayConfirmations(relayConfirmedIncidentIdsBySubscriptionKeyRef);

  if (DEBUG_CACHE) {
    const afterCount = subscriptionRegistry.subscriptions.size;
    if (afterCount === 0) {
      console.log(`🧹 [IncidentSub] stopAll complete (live after:${afterCount})`);
    }
  }
}

function pruneIncidentsToDesiredGeohashes(
  desiredKeys: Set<string>,
  incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>
): boolean {
  const { incidentMap, didPrune } = pruneIncidentsByDesiredCells({
    incidentMap: incidentMapRef.current,
    desiredCells: desiredKeys,
    geohashPrecision: MAP_SUBSCRIPTION.GEOHASH_PRECISION,
  });

  if (didPrune) {
    incidentMapRef.current = incidentMap;
  }

  return didPrune;
}

export function useIncidentSubscriptionPlannerController({
  subscriptionRegistry,
  enqueueEvents,
  flushQueuedEvents,
  recomputeVisibleStateWithRemovals,
  markHistoryRefreshSatisfied,
  setHasReceivedHistoryState,
  incidentMapRef,
  pruneUnconfirmedIncidentsForSubscription,
  relayConfirmedIncidentIdsBySubscriptionKeyRef,
  sinceDays,
}: {
  subscriptionRegistry: RegistryLike;
  enqueueEvents: (
    events: NDKEvent[],
    source: IncomingEventSource,
    subscriptionKey?: string
  ) => void;
  flushQueuedEvents: () => void;
  recomputeVisibleStateWithRemovals: (
    updatedIncidents?: ProcessedIncident[],
    removedIncidentIds?: string[]
  ) => void;
  markHistoryRefreshSatisfied: (
    key: string,
    epoch: number,
    source: 'cache' | 'eose'
  ) => void;
  setHasReceivedHistoryState: () => void;
  incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
  pruneUnconfirmedIncidentsForSubscription: (subscriptionKey: string) => string[];
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef;
  sinceDays: number;
}) {
  const startSubscription = useCallback(
    (key: string, historyRefreshEpoch?: number | null) =>
      startIncidentSubscription(key, {
        subscriptionRegistry,
        enqueueEvents,
        flushQueuedEvents,
        recomputeVisibleStateWithRemovals,
        markHistoryRefreshSatisfied,
        setHasReceivedHistoryState,
        pruneUnconfirmedIncidentsForSubscription,
        relayConfirmedIncidentIdsBySubscriptionKeyRef,
        sinceDays,
        historyRefreshEpoch,
      }),
    [
      subscriptionRegistry,
      enqueueEvents,
      flushQueuedEvents,
      recomputeVisibleStateWithRemovals,
      markHistoryRefreshSatisfied,
      setHasReceivedHistoryState,
      pruneUnconfirmedIncidentsForSubscription,
      relayConfirmedIncidentIdsBySubscriptionKeyRef,
      sinceDays,
    ]
  );

  const stopSubscription = useCallback(
    (key: string) =>
      stopIncidentSubscription(
        key,
        subscriptionRegistry,
        relayConfirmedIncidentIdsBySubscriptionKeyRef
      ),
    [relayConfirmedIncidentIdsBySubscriptionKeyRef, subscriptionRegistry]
  );

  const stopAllSubscriptions = useCallback(
    () =>
      stopAllIncidentSubscriptions(
        subscriptionRegistry,
        relayConfirmedIncidentIdsBySubscriptionKeyRef
      ),
    [relayConfirmedIncidentIdsBySubscriptionKeyRef, subscriptionRegistry]
  );

  const pruneToDesiredGeohashes = useCallback(
    (desiredKeys: Set<string>) =>
      pruneIncidentsToDesiredGeohashes(desiredKeys, incidentMapRef),
    [incidentMapRef]
  );

  return {
    startSubscription,
    stopSubscription,
    stopAllSubscriptions,
    pruneToDesiredGeohashes,
  };
}
