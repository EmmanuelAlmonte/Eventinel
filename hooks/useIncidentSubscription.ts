/**
 * useIncidentSubscription Hook
 *
 * Handles NDK subscription for incident events with deduplication,
 * sorting, and severity counting.
 */

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { NDKSubscriptionCacheUsage } from '@nostr-dev-kit/mobile';
import type { NDKEvent, NDKFilter, NDKSubscription } from '@nostr-dev-kit/mobile';
import { ndk } from '@lib/ndk';
import { parseIncidentEvent } from '@lib/nostr/events/incident';
import type { ParsedIncident } from '@lib/nostr/events/types';
import { type Severity } from '@lib/nostr/config';
import { MAPBOX_CONFIG, MAP_SUBSCRIPTION } from '@lib/map/constants';
import { planIncidentCells, type MapSubscriptionViewport } from '@lib/map/subscriptionPlanner';

// Debug flag - set to true to enable cache debugging logs
const DEBUG_CACHE = __DEV__;
const EMPTY_SEVERITY_COUNTS: Record<Severity, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const SIMPLE_FETCH_LIMIT = 200;
const CANDIDATE_RETENTION_LIMIT = 600;
const EARTH_RADIUS_METERS = 6371000;
const SUBSCRIPTION_BUFFER_MS = 100;
const GLOBAL_SUBSCRIPTION_KEY = '__global__';

type IncomingEventSource = 'cache' | 'relay';

interface QueuedEvent {
  event: NDKEvent;
  source: IncomingEventSource;
}

/**
 * Extended incident with precomputed timestamps for safe sorting
 */
export interface ProcessedIncident extends ParsedIncident {
  /** createdAt in milliseconds */
  createdAtMs: number;
  /** occurredAt in milliseconds (with fallback) */
  occurredAtMs: number;
}

export function toProcessedIncident(parsed: ParsedIncident): ProcessedIncident {
  const createdAtMs = parsed.createdAt * 1000;
  const occurredAtMs =
    parsed.occurredAt instanceof Date && !Number.isNaN(parsed.occurredAt.getTime())
      ? parsed.occurredAt.getTime()
      : createdAtMs;

  return {
    ...parsed,
    createdAtMs,
    occurredAtMs,
  };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceFromLocationMeters(
  incident: ProcessedIncident,
  location: [number, number] | null
): number {
  if (!location) {
    return Number.POSITIVE_INFINITY;
  }

  const [userLng, userLat] = location;
  const { lat: incidentLat, lng: incidentLng } = incident.location;

  if (
    !Number.isFinite(userLat) ||
    !Number.isFinite(userLng) ||
    !Number.isFinite(incidentLat) ||
    !Number.isFinite(incidentLng)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const lat1 = toRadians(userLat);
  const lat2 = toRadians(incidentLat);
  const dLat = lat2 - lat1;
  const dLng = toRadians(incidentLng - userLng);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const normalizedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(normalizedA), Math.sqrt(1 - normalizedA));

  return EARTH_RADIUS_METERS * c;
}

function sortIncidentsForDisplay(
  incidents: ProcessedIncident[],
  location: [number, number] | null
): ProcessedIncident[] {
  const entries = incidents.map((incident) => ({
    incident,
    distanceMeters: distanceFromLocationMeters(incident, location),
  }));

  entries.sort((a, b) => {
    const distanceDelta = a.distanceMeters - b.distanceMeters;
    if (distanceDelta !== 0) {
      return distanceDelta;
    }

    const occurredDelta = b.incident.occurredAtMs - a.incident.occurredAtMs;
    if (occurredDelta !== 0) {
      return occurredDelta;
    }

    return a.incident.incidentId.localeCompare(b.incident.incidentId);
  });

  return entries.map((entry) => entry.incident);
}

function sortIncidentsForRetention(incidents: ProcessedIncident[]): ProcessedIncident[] {
  return [...incidents].sort((a, b) => {
    const occurredDelta = b.occurredAtMs - a.occurredAtMs;
    if (occurredDelta !== 0) {
      return occurredDelta;
    }

    return a.incidentId.localeCompare(b.incidentId);
  });
}

export interface UseIncidentSubscriptionOptions {
  /** User location used for display ordering (nearest first). */
  location: [number, number] | null;
  /** Optional location used only for geohash subscription filtering. */
  subscriptionLocation?: [number, number] | null;
  /** Optional viewport used for subscription planning. */
  subscriptionViewport?: MapSubscriptionViewport | null;
  /** Whether subscription is enabled */
  enabled?: boolean;
  /** Maximum incidents to return */
  maxIncidents?: number;
}

type SeverityCounts = Record<Severity, number>;

export interface UseIncidentSubscriptionResult {
  /** Parsed incidents (sorted by distance, then recency, then id, sliced to max) */
  incidents: ProcessedIncident[];
  /** True until first EOSE received */
  isInitialLoading: boolean;
  /** True after EOSE (historical events received) */
  hasReceivedHistory: boolean;
  /** Severity counts for DISPLAYED incidents (post-slice) */
  severityCounts: SeverityCounts;
  /** Incidents that were updated since last render */
  updatedIncidents: ProcessedIncident[];
  /** Total events received (for debugging) */
  totalEventsReceived: number;
  /** Timestamp of last update */
  lastUpdatedAt: number | null;
}

export function useIncidentSubscription({
  location,
  subscriptionLocation,
  subscriptionViewport,
  enabled = true,
  maxIncidents = SIMPLE_FETCH_LIMIT,
}: UseIncidentSubscriptionOptions): UseIncidentSubscriptionResult {
  const effectiveMaxIncidents = Math.min(maxIncidents, SIMPLE_FETCH_LIMIT);
  const lastUpdatedRef = useRef<number | null>(null);
  const incidentMapRef = useRef<Map<string, ProcessedIncident>>(new Map());
  const lastTotalEventsRef = useRef(0);
  const lastFilterKeyRef = useRef<string | null>(null);
  const cellSubscriptionsRef = useRef<Map<string, NDKSubscription>>(new Map());
  const eoseBySubscriptionKeyRef = useRef<Map<string, boolean>>(new Map());
  const pendingEventsRef = useRef<QueuedEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<{
    incidents: ProcessedIncident[];
    severityCounts: SeverityCounts;
    updatedIncidents: ProcessedIncident[];
    totalEventsReceived: number;
    hasReceivedHistory: boolean;
  }>({
    incidents: [],
    severityCounts: { ...EMPTY_SEVERITY_COUNTS },
    updatedIncidents: [],
    totalEventsReceived: 0,
    hasReceivedHistory: false,
  });

  const effectiveSubscriptionLocation = subscriptionLocation ?? location;
  const stableLocation = useMemo<[number, number] | null>(() => {
    if (!location) {
      return null;
    }

    return [location[0], location[1]];
  }, [location?.[0], location?.[1]]);

  const stableSubscriptionLocation = useMemo<[number, number] | null>(() => {
    if (!effectiveSubscriptionLocation) {
      return null;
    }

    return [effectiveSubscriptionLocation[0], effectiveSubscriptionLocation[1]];
  }, [effectiveSubscriptionLocation?.[0], effectiveSubscriptionLocation?.[1]]);

  const fallbackSubscriptionViewport: MapSubscriptionViewport | null =
    subscriptionViewport ??
    (stableSubscriptionLocation
      ? {
          center: stableSubscriptionLocation,
          bounds: {
            ne: stableSubscriptionLocation,
            sw: stableSubscriptionLocation,
          },
          zoom: MAPBOX_CONFIG.DEFAULT_ZOOM,
        }
      : null);

  const subscriptionPlan = useMemo(() => {
    if (!enabled || !fallbackSubscriptionViewport) {
      return null;
    }

    return planIncidentCells({
      mode: MAP_SUBSCRIPTION.SUBSCRIPTION_PLANNER_MODE,
      precision: MAP_SUBSCRIPTION.GEOHASH_PRECISION,
      center: fallbackSubscriptionViewport.center,
      bounds: fallbackSubscriptionViewport.bounds,
      zoom: fallbackSubscriptionViewport.zoom,
      maxCells: MAP_SUBSCRIPTION.MAX_ACTIVE_CELLS,
      prefetchRing: MAP_SUBSCRIPTION.SUBSCRIPTION_PREFETCH_RING,
    });
  }, [
    enabled,
    fallbackSubscriptionViewport?.center[0],
    fallbackSubscriptionViewport?.center[1],
    fallbackSubscriptionViewport?.bounds?.ne?.[0],
    fallbackSubscriptionViewport?.bounds?.ne?.[1],
    fallbackSubscriptionViewport?.bounds?.sw?.[0],
    fallbackSubscriptionViewport?.bounds?.sw?.[1],
    fallbackSubscriptionViewport?.zoom,
  ]);

  const desiredCells = subscriptionPlan?.desiredCells ?? [];
  const subscriptionFilterKey = useMemo(() => {
    if (!enabled) {
      return 'disabled';
    }
    return subscriptionPlan?.key ?? 'global';
  }, [enabled, subscriptionPlan?.key]);

  const locationKey = useMemo(() => {
    if (!location) {
      return 'none';
    }
    return `${location[0]},${location[1]}`;
  }, [location]);

  const computeHasReceivedHistory = useCallback(() => {
    if (!enabled) {
      return false;
    }

    const keys = Array.from(cellSubscriptionsRef.current.keys());
    if (keys.length === 0) {
      return false;
    }

    return keys.every((key) => eoseBySubscriptionKeyRef.current.get(key) === true);
  }, [enabled]);

  const recomputeVisibleState = useCallback(
    (updatedIncidents: ProcessedIncident[] = []) => {
      if (!enabled) {
        return;
      }

      if (incidentMapRef.current.size > CANDIDATE_RETENTION_LIMIT) {
        const retained = stableLocation
          ? sortIncidentsForDisplay(Array.from(incidentMapRef.current.values()), stableLocation).slice(
              0,
              CANDIDATE_RETENTION_LIMIT
            )
          : sortIncidentsForRetention(Array.from(incidentMapRef.current.values())).slice(
              0,
              CANDIDATE_RETENTION_LIMIT
            );

        incidentMapRef.current = new Map(
          retained.map((incident) => [incident.incidentId, incident])
        );
      }

      const sorted = sortIncidentsForDisplay(
        Array.from(incidentMapRef.current.values()),
        stableLocation
      );
      const sliced = sorted.slice(0, effectiveMaxIncidents);

      const severityCounts: SeverityCounts = { ...EMPTY_SEVERITY_COUNTS };
      for (const incident of sliced) {
        severityCounts[incident.severity]++;
      }

      if (updatedIncidents.length > 0) {
        lastUpdatedRef.current = Date.now();
      }

      setState({
        incidents: sliced,
        severityCounts,
        updatedIncidents,
        totalEventsReceived: lastTotalEventsRef.current,
        hasReceivedHistory: computeHasReceivedHistory(),
      });
    },
    [computeHasReceivedHistory, effectiveMaxIncidents, enabled, stableLocation]
  );

  const flushQueuedEvents = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const queued = pendingEventsRef.current;
    if (queued.length === 0) {
      return;
    }

    pendingEventsRef.current = [];

    const updatedIncidents: ProcessedIncident[] = [];
    let didUpdate = false;
    let totalRelevantEvents = 0;
    let cacheCount = 0;
    let relayCount = 0;

    for (const { event, source } of queued) {
      if ((event as NDKEvent).kind !== 30911) {
        continue;
      }

      totalRelevantEvents++;
      if (source === 'cache') {
        cacheCount++;
      } else {
        relayCount++;
      }

      const parsed = parseIncidentEvent(event);
      if (!parsed) {
        continue;
      }

      const processed = toProcessedIncident(parsed);
      const existing = incidentMapRef.current.get(parsed.incidentId);
      const shouldReplace =
        !existing ||
        parsed.createdAt > existing.createdAt ||
        (parsed.createdAt === existing.createdAt &&
          parsed.eventId.localeCompare(existing.eventId) > 0);

      if (shouldReplace) {
        incidentMapRef.current.set(parsed.incidentId, processed);
        updatedIncidents.push(processed);
        didUpdate = true;
      }
    }

    if (totalRelevantEvents === 0) {
      return;
    }

    lastTotalEventsRef.current += totalRelevantEvents;

    if (DEBUG_CACHE) {
      console.log(
        `📥 [IncidentSub] +${totalRelevantEvents} events (cache:${cacheCount}, relay:${relayCount})`
      );
    }

    if (didUpdate) {
      recomputeVisibleState(updatedIncidents);
      return;
    }

    setState((prev) => ({
      ...prev,
      totalEventsReceived: lastTotalEventsRef.current,
      updatedIncidents: [],
      hasReceivedHistory: computeHasReceivedHistory(),
    }));
  }, [computeHasReceivedHistory, recomputeVisibleState]);

  const enqueueEvents = useCallback(
    (events: NDKEvent[], source: IncomingEventSource) => {
      if (!events || events.length === 0) {
        return;
      }

      for (const event of events) {
        pendingEventsRef.current.push({ event, source });
      }

      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(flushQueuedEvents, SUBSCRIPTION_BUFFER_MS);
      }
    },
    [flushQueuedEvents]
  );

  const stopSubscription = useCallback((key: string) => {
    const subscription = cellSubscriptionsRef.current.get(key);
    if (subscription) {
      subscription.stop();
      cellSubscriptionsRef.current.delete(key);
    }
    eoseBySubscriptionKeyRef.current.delete(key);
  }, []);

  const stopAllSubscriptions = useCallback(() => {
    for (const sub of cellSubscriptionsRef.current.values()) {
      sub.stop();
    }
    cellSubscriptionsRef.current.clear();
    eoseBySubscriptionKeyRef.current.clear();
  }, []);

  const pruneToDesiredGeohashes = useCallback((desiredGeohashes: Set<string>) => {
    let removed = false;

    for (const [incidentId, incident] of incidentMapRef.current.entries()) {
      const geohash = incident.location.geohash?.toLowerCase();
      if (!geohash) {
        continue;
      }

      const cell = geohash.slice(0, MAP_SUBSCRIPTION.GEOHASH_PRECISION);
      if (!desiredGeohashes.has(cell)) {
        incidentMapRef.current.delete(incidentId);
        removed = true;
      }
    }

    return removed;
  }, []);

  const startSubscription = useCallback(
    (key: string) => {
      const filter: NDKFilter =
        key === GLOBAL_SUBSCRIPTION_KEY
          ? {
              kinds: [30911 as number],
              limit: SIMPLE_FETCH_LIMIT,
            }
          : {
              kinds: [30911 as number],
              '#g': [key],
              limit: SIMPLE_FETCH_LIMIT,
            };

      const subscription = ndk.subscribe([filter], {
        closeOnEose: false,
        cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
        groupable: false,
        onEvents: (events) => {
          enqueueEvents(events, 'cache');
        },
        onEvent: (event) => {
          enqueueEvents([event], 'relay');
        },
        onEose: () => {
          eoseBySubscriptionKeyRef.current.set(key, true);
          setState((prev) => ({
            ...prev,
            hasReceivedHistory: computeHasReceivedHistory(),
          }));
        },
      });

      cellSubscriptionsRef.current.set(key, subscription);
      eoseBySubscriptionKeyRef.current.set(key, false);
    },
    [computeHasReceivedHistory, enqueueEvents]
  );

  // Handle enabled/disabled lifecycle.
  useEffect(() => {
    if (enabled) {
      return;
    }

    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    pendingEventsRef.current = [];
    stopAllSubscriptions();
    incidentMapRef.current.clear();
    lastUpdatedRef.current = null;
    lastTotalEventsRef.current = 0;
    lastFilterKeyRef.current = 'disabled';

    setState({
      incidents: [],
      severityCounts: { ...EMPTY_SEVERITY_COUNTS },
      updatedIncidents: [],
      totalEventsReceived: 0,
      hasReceivedHistory: false,
    });
  }, [enabled, stopAllSubscriptions]);

  // Reconcile desired cells against active subscriptions.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const desiredKeys = desiredCells.length > 0 ? new Set(desiredCells) : new Set([GLOBAL_SUBSCRIPTION_KEY]);

    const activeKeys = new Set(cellSubscriptionsRef.current.keys());
    const toAdd = Array.from(desiredKeys).filter((key) => !activeKeys.has(key));
    const toRemove = Array.from(activeKeys).filter((key) => !desiredKeys.has(key));

    if (DEBUG_CACHE && lastFilterKeyRef.current !== subscriptionFilterKey) {
      console.log(
        `🔁 [IncidentSub] Reconcile filter ${subscriptionFilterKey} (add:${toAdd.length}, remove:${toRemove.length}, truncated:${subscriptionPlan?.truncated ?? false})`
      );
    }
    lastFilterKeyRef.current = subscriptionFilterKey;

    for (const key of toRemove) {
      stopSubscription(key);
    }

    for (const key of toAdd) {
      startSubscription(key);
    }

    if (desiredCells.length > 0) {
      const didPrune = pruneToDesiredGeohashes(desiredKeys);
      if (didPrune) {
        recomputeVisibleState([]);
      }
    }

    if (toAdd.length > 0 || toRemove.length > 0) {
      setState((prev) => {
        const hasReceivedHistory = computeHasReceivedHistory();
        if (prev.hasReceivedHistory === hasReceivedHistory) {
          return prev;
        }

        return {
          ...prev,
          hasReceivedHistory,
        };
      });
    }
  }, [
    computeHasReceivedHistory,
    enabled,
    subscriptionFilterKey,
    pruneToDesiredGeohashes,
    startSubscription,
    stopSubscription,
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
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pendingEventsRef.current = [];
      stopAllSubscriptions();
    };
  }, [stopAllSubscriptions]);

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
