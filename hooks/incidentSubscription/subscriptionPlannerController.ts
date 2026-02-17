import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  NDKFilter,
  NDKSubscription,
  NDKSubscriptionCacheUsage,
  type NDKEvent,
} from '@nostr-dev-kit/mobile';

import { MAP_SUBSCRIPTION } from '@lib/map/constants';
import { INCIDENT_LIMITS } from '@lib/map/constants';
import { ndk } from '@lib/ndk';
import { pruneIncidentsByDesiredCells } from './reconcile';
import type {
  IncidentSubscriptionDisplayState,
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

function createIncidentSubscriptionFilter(key: string): NDKFilter {
  return {
    kinds: [30911 as number],
    '#g': [key],
    limit: INCIDENT_LIMITS.FETCH_LIMIT,
  };
}

function startIncidentSubscription(
  key: string,
  args: {
    subscriptionRegistry: RegistryLike;
    enqueueEvents: (events: NDKEvent[], source: IncomingEventSource) => void;
    hasReceivedHistory: () => boolean;
    setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
  }
): void {
  const beforeCount = args.subscriptionRegistry.subscriptions.size;
  if (DEBUG_CACHE) {
    console.log(
      `🔔 [IncidentSub] Start requested for key ${key} (live before:${beforeCount})`
    );
  }

  const subscription = ndk.subscribe([createIncidentSubscriptionFilter(key)], {
    closeOnEose: false,
    cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    groupable: false,
    onEvents: (events) => {
      args.enqueueEvents(events, 'cache');
    },
    onEvent: (event) => {
      args.enqueueEvents([event], 'relay');
    },
    onEose: () => {
      args.subscriptionRegistry.setHasReceivedHistory(key);
      args.setState((prev) => ({
        ...prev,
        hasReceivedHistory: args.hasReceivedHistory(),
      }));
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
  subscriptionRegistry: RegistryLike
): void {
  const beforeCount = subscriptionRegistry.subscriptions.size;
  if (DEBUG_CACHE && subscriptionRegistry.subscriptions.has(key)) {
    console.log(
      `🛑 [IncidentSub] Stop requested for key ${key} (live before:${beforeCount})`
    );
  }

  subscriptionRegistry.stop(key);

  if (DEBUG_CACHE) {
    const afterCount = subscriptionRegistry.subscriptions.size;
    if (beforeCount !== afterCount) {
      console.log(`🛑 [IncidentSub] Stopped key ${key} (live after:${afterCount})`);
    }
  }
}

function stopAllIncidentSubscriptions(subscriptionRegistry: RegistryLike): void {
  if (DEBUG_CACHE) {
    const beforeCount = subscriptionRegistry.subscriptions.size;
    if (beforeCount > 0) {
      console.log(`🧹 [IncidentSub] stopAll requested (live before:${beforeCount})`);
    }
  }

  subscriptionRegistry.stopAll();

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
  hasReceivedHistory,
  setState,
  incidentMapRef,
}: {
  subscriptionRegistry: RegistryLike;
  enqueueEvents: (events: NDKEvent[], source: IncomingEventSource) => void;
  hasReceivedHistory: () => boolean;
  setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
  incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
}) {
  const startSubscription = useCallback(
    (key: string) =>
      startIncidentSubscription(key, {
        subscriptionRegistry,
        enqueueEvents,
        hasReceivedHistory,
        setState,
      }),
    [subscriptionRegistry, enqueueEvents, hasReceivedHistory, setState]
  );

  const stopSubscription = useCallback(
    (key: string) => stopIncidentSubscription(key, subscriptionRegistry),
    [subscriptionRegistry]
  );

  const stopAllSubscriptions = useCallback(
    () => stopAllIncidentSubscriptions(subscriptionRegistry),
    [subscriptionRegistry]
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
