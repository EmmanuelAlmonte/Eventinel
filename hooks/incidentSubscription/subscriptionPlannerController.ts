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
import { ndk } from '@lib/ndk';
import { buildIncidentSubscriptionFilter } from '@hooks/incidents/buildIncidentSubscriptionFilter';
import {
  getLiveIncidentWindow,
  type IncidentBackfillWindow,
} from './backfillWindows';
import {
  clearRelayConfirmations,
  deleteRelayConfirmationsForSubscription,
  resetRelayConfirmationsForSubscription,
  type PruneUnconfirmedIncidentOptions,
  type RelayConfirmationMapRef,
} from './cacheConfirmation';
import { pruneIncidentsByDesiredCells } from './reconcile';
import type {
  IncidentSubscriptionGroup,
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

type StartBackfillSubscriptionArgs = {
  group: IncidentSubscriptionGroup;
  historyWindow: IncidentBackfillWindow;
  subscriptionKey: string;
  onEose: (subscriptionKey: string) => void;
};

function createIncidentSubscriptionFilters(
  group: IncidentSubscriptionGroup,
  sinceDays: number,
  historyWindow: IncidentBackfillWindow = getLiveIncidentWindow(sinceDays)
): NDKFilter[] {
  const limit = Math.min(
    INCIDENT_LIMITS.FETCH_LIMIT * Math.max(1, group.cells.length),
    INCIDENT_LIMITS.GROUPED_FETCH_LIMIT_MAX
  );
  const filters = buildIncidentSubscriptionFilter({
    enabled: true,
    geohashGrid: group.cells,
    limit,
    cellCatchUpLimit: INCIDENT_LIMITS.GROUPED_CELL_CATCH_UP_LIMIT,
    since: historyWindow.since,
    until: historyWindow.until,
  });

  if (filters === false) {
    throw new Error('Incident subscription filter unexpectedly disabled');
  }

  return filters;
}

function startIncidentSubscription(
  group: IncidentSubscriptionGroup,
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
    setHasReceivedHistoryState: (removedIncidentIds?: string[]) => void;
    settlePendingDesiredCellPrune: () => void;
    skippedHistoryRefreshKeysRef: MutableRefObject<Set<string>>;
    sinceDays: number;
    relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef;
    pruneUnconfirmedIncidentsForSubscription: (
      subscriptionKey: string,
      options?: PruneUnconfirmedIncidentOptions
    ) => string[];
    historyRefreshEpoch?: number | null;
  }
): void {
  const { key } = group;
  const beforeCount = args.subscriptionRegistry.subscriptions.size;
  if (DEBUG_CACHE) {
    console.log(
      `🔔 [IncidentSub] Start requested for key ${key} (cells:${group.cells.length}, live before:${beforeCount})`
    );
  }

  resetRelayConfirmationsForSubscription(
    args.relayConfirmedIncidentIdsBySubscriptionKeyRef,
    key
  );

  const liveHistoryWindow = getLiveIncidentWindow(args.sinceDays);
  const subscription = ndk.subscribe(
    createIncidentSubscriptionFilters(group, args.sinceDays, liveHistoryWindow),
    {
      closeOnEose: false,
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
      // We group geohashes explicitly into deterministic filters. NDK-level grouping
      // remains disabled so reconcile and EOSE accounting stay owned by this layer.
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
        args.skippedHistoryRefreshKeysRef.current.delete(key);
        args.flushQueuedEvents();
        const removedIncidentIds = args.pruneUnconfirmedIncidentsForSubscription(
          key,
          {
            shouldPruneIncident: (incident) =>
              incidentBelongsToHistoryWindow(incident, liveHistoryWindow),
          }
        );
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
          args.setHasReceivedHistoryState(removedIncidentIds);
          args.settlePendingDesiredCellPrune();
          return;
        }
        args.setHasReceivedHistoryState();
        args.settlePendingDesiredCellPrune();
      },
    }
  );

  args.subscriptionRegistry.start(key, subscription);
  if (DEBUG_CACHE) {
    const afterCount = args.subscriptionRegistry.subscriptions.size;
    console.log(
      `✅ [IncidentSub] Subscribed key ${key} (cells:${group.cells.length}, live after:${afterCount})`
    );
  }
}

function filterEventsForBackfillWindow(
  events: NDKEvent[],
  historyWindow: IncidentBackfillWindow
): NDKEvent[] {
  return events.filter((event) => {
    const createdAt = event.created_at;
    if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) {
      return false;
    }
    if (createdAt < historyWindow.since) {
      return false;
    }
    if (historyWindow.until != null && createdAt >= historyWindow.until) {
      return false;
    }
    return true;
  });
}

function incidentBelongsToHistoryWindow(
  incident: ProcessedIncident,
  historyWindow: IncidentBackfillWindow
): boolean {
  const createdAtUnixSeconds = Math.floor(incident.createdAtMs / 1000);
  if (!Number.isFinite(createdAtUnixSeconds)) {
    return false;
  }
  if (createdAtUnixSeconds < historyWindow.since) {
    return false;
  }
  if (historyWindow.until != null && createdAtUnixSeconds >= historyWindow.until) {
    return false;
  }
  return true;
}

function startIncidentBackfillSubscription(
  {
    group,
    historyWindow,
    subscriptionKey,
    onEose,
  }: StartBackfillSubscriptionArgs,
  args: {
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
    setHasReceivedHistoryState: (removedIncidentIds?: string[]) => void;
    pruneUnconfirmedIncidentsForSubscription: (
      subscriptionKey: string,
      options?: PruneUnconfirmedIncidentOptions
    ) => string[];
    relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef;
    sinceDays: number;
  }
): NDKSubscription {
  resetRelayConfirmationsForSubscription(
    args.relayConfirmedIncidentIdsBySubscriptionKeyRef,
    subscriptionKey
  );

  const subscription = ndk.subscribe(
    createIncidentSubscriptionFilters(group, args.sinceDays, historyWindow),
    {
      closeOnEose: true,
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
      groupable: false,
      onEvents: (events) => {
        args.enqueueEvents(
          filterEventsForBackfillWindow(events, historyWindow),
          'cache',
          subscriptionKey
        );
      },
      onEvent: (event) => {
        args.enqueueEvents(
          filterEventsForBackfillWindow([event], historyWindow),
          'relay',
          subscriptionKey
        );
      },
      onEose: () => {
        args.flushQueuedEvents();
        const removedIncidentIds = args.pruneUnconfirmedIncidentsForSubscription(
          subscriptionKey,
          {
            cellGroupKey: group.key,
            shouldPruneIncident: (incident) =>
              incidentBelongsToHistoryWindow(incident, historyWindow),
          }
        );
        if (removedIncidentIds.length > 0) {
          args.recomputeVisibleStateWithRemovals([], removedIncidentIds);
          args.setHasReceivedHistoryState(removedIncidentIds);
        }
        setTimeout(() => onEose(subscriptionKey), 0);
      },
    }
  );

  if (DEBUG_CACHE) {
    console.log(
      `📚 [IncidentSub] Backfill ${subscriptionKey} window:${historyWindow.key} cells:${group.cells.length}`
    );
  }

  return subscription;
}

function stopIncidentBackfillSubscription(
  key: string,
  subscription: NDKSubscription,
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef
): void {
  subscription.stop();
  deleteRelayConfirmationsForSubscription(
    relayConfirmedIncidentIdsBySubscriptionKeyRef,
    key
  );
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
): string[] {
  const { incidentMap, didPrune, removedIncidentIds } = pruneIncidentsByDesiredCells({
    incidentMap: incidentMapRef.current,
    desiredCells: desiredKeys,
    geohashPrecision: MAP_SUBSCRIPTION.GEOHASH_PRECISION,
  });

  if (didPrune) {
    incidentMapRef.current = incidentMap;
  }

  return removedIncidentIds;
}

export function useIncidentSubscriptionPlannerController({
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
  setHasReceivedHistoryState: (removedIncidentIds?: string[]) => void;
  hasReceivedHistory: () => boolean;
  incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
  pendingDesiredCellsPruneRef: MutableRefObject<Set<string> | null>;
  skippedHistoryRefreshKeysRef: MutableRefObject<Set<string>>;
  pruneUnconfirmedIncidentsForSubscription: (
    subscriptionKey: string,
    options?: PruneUnconfirmedIncidentOptions
  ) => string[];
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef;
  sinceDays: number;
}) {
  const settlePendingDesiredCellPrune = useCallback(() => {
    if (!hasReceivedHistory()) {
      return;
    }

    const pendingDesiredCells = pendingDesiredCellsPruneRef.current;
    if (!pendingDesiredCells) {
      return;
    }

    pendingDesiredCellsPruneRef.current = null;
    const removedIncidentIds = pruneIncidentsToDesiredGeohashes(
      pendingDesiredCells,
      incidentMapRef
    );
    if (removedIncidentIds.length > 0) {
      recomputeVisibleStateWithRemovals([], removedIncidentIds);
    }
  }, [
    hasReceivedHistory,
    incidentMapRef,
    pendingDesiredCellsPruneRef,
    recomputeVisibleStateWithRemovals,
  ]);

  const startSubscription = useCallback(
    (group: IncidentSubscriptionGroup, historyRefreshEpoch?: number | null) =>
      startIncidentSubscription(group, {
        subscriptionRegistry,
        enqueueEvents,
        flushQueuedEvents,
        recomputeVisibleStateWithRemovals,
        markHistoryRefreshSatisfied,
        setHasReceivedHistoryState,
        settlePendingDesiredCellPrune,
        skippedHistoryRefreshKeysRef,
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
      settlePendingDesiredCellPrune,
      skippedHistoryRefreshKeysRef,
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

  const startBackfillSubscription = useCallback(
    (
      group: IncidentSubscriptionGroup,
      historyWindow: IncidentBackfillWindow,
      subscriptionKey: string,
      onEose: (subscriptionKey: string) => void
    ) =>
      startIncidentBackfillSubscription(
        {
          group,
          historyWindow,
          subscriptionKey,
          onEose,
        },
        {
          enqueueEvents,
          flushQueuedEvents,
          recomputeVisibleStateWithRemovals,
          setHasReceivedHistoryState,
          pruneUnconfirmedIncidentsForSubscription,
          relayConfirmedIncidentIdsBySubscriptionKeyRef,
          sinceDays,
        }
      ),
    [
      enqueueEvents,
      flushQueuedEvents,
      recomputeVisibleStateWithRemovals,
      setHasReceivedHistoryState,
      pruneUnconfirmedIncidentsForSubscription,
      relayConfirmedIncidentIdsBySubscriptionKeyRef,
      sinceDays,
    ]
  );

  const stopBackfillSubscription = useCallback(
    (key: string, subscription: NDKSubscription) =>
      stopIncidentBackfillSubscription(
        key,
        subscription,
        relayConfirmedIncidentIdsBySubscriptionKeyRef
      ),
    [relayConfirmedIncidentIdsBySubscriptionKeyRef]
  );

  const stopAllBackfillSubscriptions = useCallback(
    (subscriptions: Map<string, NDKSubscription>) => {
      for (const [key, subscription] of subscriptions.entries()) {
        stopIncidentBackfillSubscription(
          key,
          subscription,
          relayConfirmedIncidentIdsBySubscriptionKeyRef
        );
      }
      subscriptions.clear();
    },
    [relayConfirmedIncidentIdsBySubscriptionKeyRef]
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
    startBackfillSubscription,
    stopBackfillSubscription,
    stopAllBackfillSubscriptions,
    pruneToDesiredGeohashes,
  };
}
