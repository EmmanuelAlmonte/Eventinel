/**
 * useIncidentSubscription Hook
 *
 * Handles NDK subscription for incident events with deduplication,
 * sorting, and severity counting.
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import { useSubscribe, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/mobile';
import type { NDKEvent, NDKFilter } from '@nostr-dev-kit/mobile';
import { parseIncidentEvent } from '@lib/nostr/events/incident';
import type { ParsedIncident } from '@lib/nostr/events/types';
import { DEFAULT_GEOHASH_PRECISION, type Severity } from '@lib/nostr/config';
import geohash from 'ngeohash';

// Debug flag - set to true to enable cache debugging logs
const DEBUG_CACHE = __DEV__;
const EMPTY_SEVERITY_COUNTS: Record<Severity, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const SIMPLE_FETCH_LIMIT = 200;
const CANDIDATE_RETENTION_LIMIT = 600;
const EARTH_RADIUS_METERS = 6371000;

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

function getGeohashGrid9(center: string): string[] {
  const neighbors = geohash.neighbors(center);
  const candidateCells = [center, ...neighbors].filter(Boolean);
  // Keep order stable so filterKey stays stable and useSubscribe doesn't churn.
  return Array.from(new Set(candidateCells)).sort();
}

export interface UseIncidentSubscriptionOptions {
  /** User location used for display ordering (nearest first). */
  location: [number, number] | null;
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
  enabled = true,
  maxIncidents = SIMPLE_FETCH_LIMIT,
}: UseIncidentSubscriptionOptions): UseIncidentSubscriptionResult {
  const effectiveMaxIncidents = Math.min(maxIncidents, SIMPLE_FETCH_LIMIT);
  const lastUpdatedRef = useRef<number | null>(null);
  const incidentMapRef = useRef<Map<string, ProcessedIncident>>(new Map());
  const lastEventCountRef = useRef(0);
  const lastFilterKeyRef = useRef<string | null>(null);
  const lastLocationKeyRef = useRef<string>('none');
  const lastMaxIncidentsRef = useRef(effectiveMaxIncidents);
  const lastTotalEventsRef = useRef(0);

  const [state, setState] = useState<{
    incidents: ProcessedIncident[];
    severityCounts: SeverityCounts;
    updatedIncidents: ProcessedIncident[];
    totalEventsReceived: number;
  }>({
    incidents: [],
    severityCounts: { ...EMPTY_SEVERITY_COUNTS },
    updatedIncidents: [],
    totalEventsReceived: 0,
  });

  const centerGeohash = useMemo(() => {
    if (!enabled || !location) {
      return null;
    }

    const [userLng, userLat] = location;
    if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
      return null;
    }

    return geohash.encode(userLat, userLng, DEFAULT_GEOHASH_PRECISION);
  }, [enabled, location?.[0], location?.[1]]);

  const geohashGrid9 = useMemo(() => {
    if (!centerGeohash) {
      return null;
    }
    return getGeohashGrid9(centerGeohash);
  }, [centerGeohash]);

  // Build NDK filter (single subscription). If location is available, prefilter to 3x3 grid.
  const subscriptionFilter = useMemo((): NDKFilter[] | false => {
    if (!enabled) return false;

    if (geohashGrid9 && geohashGrid9.length > 0) {
      return [
        {
          kinds: [30911 as number],
          '#g': geohashGrid9,
          limit: SIMPLE_FETCH_LIMIT,
        },
      ];
    }

    return [
      {
        kinds: [30911 as number],
        limit: SIMPLE_FETCH_LIMIT,
      },
    ];
  }, [enabled, geohashGrid9]);

  const filterKey = useMemo(() => {
    if (!enabled) {
      return 'disabled';
    }
    if (geohashGrid9 && geohashGrid9.length > 0) {
      return `g9:${geohashGrid9.join('|')}:limit:${SIMPLE_FETCH_LIMIT}`;
    }
    return `global:${SIMPLE_FETCH_LIMIT}`;
  }, [enabled, geohashGrid9]);

  const locationKey = useMemo(() => {
    if (!location) {
      return 'none';
    }
    return `${location[0]},${location[1]}`;
  }, [location]);

  const subscriptionOptions = useMemo(
    () => ({
      closeOnEose: false,
      bufferMs: 100,
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
      groupable: false, // Execute immediately, avoid timer race on cleanup
    }),
    []
  );

  // Subscribe with explicit CACHE_FIRST to ensure cached events load immediately.
  // groupable: false - Prevents NDK timer race condition that causes "No filters to merge"
  // error when subscription is stopped before EOSE (see NDK removeItem bug).
  const { events, eose } = useSubscribe(subscriptionFilter, subscriptionOptions);

  // Debug: Track event count changes to see cache vs relay timing
  const prevEventCountForDebug = useRef(0);
  const subscriptionStartTime = useRef(Date.now());
  const loggedEoseForCycleRef = useRef(false);

  useEffect(() => {
    if (!DEBUG_CACHE) return;

    if (subscriptionFilter && prevEventCountForDebug.current === 0 && events.length === 0) {
      subscriptionStartTime.current = Date.now();
      console.log('🔍 [IncidentSub] Subscription started, waiting for events...');
    }

    if (events.length > prevEventCountForDebug.current) {
      const elapsed = Date.now() - subscriptionStartTime.current;
      const newEvents = events.length - prevEventCountForDebug.current;
      const source = !eose ? 'CACHE (pre-EOSE)' : 'RELAY (post-EOSE)';

      console.log(`📥 [IncidentSub] +${newEvents} events (total: ${events.length}) from ${source} @ ${elapsed}ms`);

      if (!eose && events.length > 0) {
        console.log('   ✅ Cache is working! Events loaded before relay EOSE');
      }
    }

    prevEventCountForDebug.current = events.length;
  }, [events.length, eose, subscriptionFilter]);

  // Debug: Log when EOSE is received
  useEffect(() => {
    if (!DEBUG_CACHE) return;

    if (!eose) {
      loggedEoseForCycleRef.current = false;
      return;
    }

    if (loggedEoseForCycleRef.current) {
      return;
    }

    loggedEoseForCycleRef.current = true;
    const elapsed = Date.now() - subscriptionStartTime.current;
    console.log(`✅ [IncidentSub] EOSE received @ ${elapsed}ms (${events.length} total events)`);
  }, [eose, events.length]);

  useEffect(() => {
    if (!enabled) {
      if (lastFilterKeyRef.current !== 'disabled' || lastTotalEventsRef.current !== 0) {
        setState({
          incidents: [],
          severityCounts: { ...EMPTY_SEVERITY_COUNTS },
          updatedIncidents: [],
          totalEventsReceived: 0,
        });
      }
      incidentMapRef.current.clear();
      lastEventCountRef.current = 0;
      lastTotalEventsRef.current = 0;
      lastFilterKeyRef.current = 'disabled';
      lastLocationKeyRef.current = locationKey;
      lastUpdatedRef.current = null;
      lastMaxIncidentsRef.current = effectiveMaxIncidents;
      return;
    }

    const filterChanged = lastFilterKeyRef.current !== filterKey;
    const locationChanged = lastLocationKeyRef.current !== locationKey;
    const eventsShrunk = events.length < lastEventCountRef.current;
    let reset = filterChanged || eventsShrunk;
    lastFilterKeyRef.current = filterKey;
    lastLocationKeyRef.current = locationKey;

    if (reset) {
      incidentMapRef.current.clear();
      lastEventCountRef.current = 0;
    }

    const startIndex = reset ? 0 : lastEventCountRef.current;
    const newEvents = events.slice(startIndex);
    const updatedIncidents: ProcessedIncident[] = [];
    let didUpdate = false;

    for (const event of newEvents) {
      if ((event as NDKEvent).kind !== 30911) {
        continue;
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

    lastEventCountRef.current = events.length;

    const maxChanged = lastMaxIncidentsRef.current !== effectiveMaxIncidents;
    if (maxChanged) {
      lastMaxIncidentsRef.current = effectiveMaxIncidents;
    }

    const totalChanged = events.length !== lastTotalEventsRef.current;

    if (didUpdate || reset || maxChanged || locationChanged) {
      if (incidentMapRef.current.size > CANDIDATE_RETENTION_LIMIT) {
        const retained = location
          ? sortIncidentsForDisplay(Array.from(incidentMapRef.current.values()), location).slice(
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
        location
      );
      const sliced = sorted.slice(0, effectiveMaxIncidents);

      const severityCounts: SeverityCounts = { ...EMPTY_SEVERITY_COUNTS };
      for (const incident of sliced) {
        severityCounts[incident.severity]++;
      }

      if (updatedIncidents.length > 0) {
        lastUpdatedRef.current = Date.now();
      }

      lastTotalEventsRef.current = events.length;

      setState({
        incidents: sliced,
        severityCounts,
        updatedIncidents,
        totalEventsReceived: events.length,
      });
      return;
    }

    if (totalChanged) {
      lastTotalEventsRef.current = events.length;
      setState((prev) => ({
        ...prev,
        totalEventsReceived: events.length,
        updatedIncidents: [],
      }));
    }
  }, [
    enabled,
    events,
    effectiveMaxIncidents,
    filterKey,
    location,
    locationKey,
  ]);

  return {
    incidents: state.incidents,
    severityCounts: state.severityCounts,
    updatedIncidents: state.updatedIncidents,
    totalEventsReceived: state.totalEventsReceived,
    isInitialLoading: !eose,
    hasReceivedHistory: eose,
    lastUpdatedAt: lastUpdatedRef.current,
  };
}
