/**
 * useIncidentSubscription Hook
 *
 * Handles NDK subscription for incident events with deduplication,
 * sorting, and severity counting.
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import {
  useSubscribe,
  NDKEvent,
  NDKSubscriptionCacheUsage,
} from '@nostr-dev-kit/mobile';
import type { NDKFilter } from '@nostr-dev-kit/mobile';
import { parseIncidentEvent } from '@lib/nostr/events/incident';
import type { ParsedIncident } from '@lib/nostr/events/types';
import type { Severity } from '@lib/nostr/config';
import { ndk } from '@lib/ndk';

// Debug flag - set to true to enable cache debugging logs
const DEBUG_CACHE = __DEV__;
const EMPTY_SEVERITY_COUNTS: Record<Severity, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const SIMPLE_FETCH_LIMIT = 200;
const CANDIDATE_RETENTION_LIMIT = 600;
const EARTH_RADIUS_METERS = 6371000;
const METERS_PER_MILE = 1609.344;
const G_FANOUT_MAX_TAGS = 50;
const G_FANOUT_MAX_DISTANCE_MILES = 25;
const DVM_REQUEST_KIND = 5990;
const DVM_RESULT_KIND = 6990;
const DVM_DEFAULT_RADIUS_MILES = 5;
const DVM_DEFAULT_MAX_RESULTS = 200;
const DVM_DEFAULT_SINCE_DAYS = 7;
const NON_DVM_DEFAULT_RADIUS_MILES = 5;
const MIN_RADIUS_MILES = 0.05;
const MAX_RADIUS_MILES = 50;

function envFlagEnabled(value: string | undefined): boolean {
  return value === 'true';
}

function getDvmResponseMode(): 'refs_only' | 'enriched' | 'both' {
  const raw = process.env.EXPO_PUBLIC_DVM_RESPONSE_MODE;
  if (raw === 'refs_only' || raw === 'enriched' || raw === 'both') {
    return raw;
  }
  return 'enriched';
}

function clampRadiusMiles(value: number): number {
  return Math.max(MIN_RADIUS_MILES, Math.min(MAX_RADIUS_MILES, value));
}

function getNonDvmRadiusMiles(): number {
  const raw = process.env.EXPO_PUBLIC_INCIDENT_RADIUS_MILES;
  if (!raw) {
    return NON_DVM_DEFAULT_RADIUS_MILES;
  }

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    return NON_DVM_DEFAULT_RADIUS_MILES;
  }

  return clampRadiusMiles(parsed);
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

function parseCoordinateTagValue(value: string): { lat: number; lng: number } | null {
  const parts = value.split(',');
  if (parts.length !== 2) {
    return null;
  }

  const lat = Number.parseFloat(parts[0]);
  const lng = Number.parseFloat(parts[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
}

function buildNearbyGTagFilterValues(
  incidents: ProcessedIncident[],
  location: [number, number] | null
): string[] {
  if (!location || incidents.length === 0) {
    return [];
  }

  const maxDistanceMeters = G_FANOUT_MAX_DISTANCE_MILES * METERS_PER_MILE;
  const sorted = sortIncidentsForDisplay(incidents, location);
  const seen = new Set<string>();
  const values: string[] = [];

  for (const incident of sorted) {
    const gTagValue = incident.location.geohash;
    if (!gTagValue || seen.has(gTagValue)) {
      continue;
    }

    if (!parseCoordinateTagValue(gTagValue)) {
      continue;
    }

    const distanceMeters = distanceFromLocationMeters(incident, location);
    if (!Number.isFinite(distanceMeters) || distanceMeters > maxDistanceMeters) {
      continue;
    }

    seen.add(gTagValue);
    values.push(gTagValue);

    if (values.length >= G_FANOUT_MAX_TAGS) {
      break;
    }
  }

  return values;
}

function dedupeStringArray(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function quantizeCoordinate(value: number, decimals = 4): string {
  const factor = 10 ** decimals;
  return (Math.round(value * factor) / factor).toFixed(decimals);
}

function extractDvmIncidentEventIds(resultEvent: NDKEvent, requestId: string): string[] {
  const ids = resultEvent.tags
    .filter((tag) => Array.isArray(tag) && tag[0] === 'e' && typeof tag[1] === 'string')
    .map((tag) => tag[1] as string)
    .filter((id) => id && id !== requestId);

  return dedupeStringArray(ids);
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
  const nearbyGTagsKeyRef = useRef<string>('');
  const [nearbyGTags, setNearbyGTags] = useState<string[]>([]);
  const [dvmRequestId, setDvmRequestId] = useState<string | null>(null);
  const dvmRequestKeyRef = useRef<string>('none');

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

  const dvmEnabled = useMemo(() => {
    return enabled && !!location && envFlagEnabled(process.env.EXPO_PUBLIC_USE_DVM_GEO_QUERY);
  }, [enabled, location]);

  const displayRadiusMiles = useMemo(() => {
    return dvmEnabled ? DVM_DEFAULT_RADIUS_MILES : getNonDvmRadiusMiles();
  }, [dvmEnabled]);

  // Build NDK filter
  const globalFilter = useMemo((): NDKFilter[] | false => {
    if (!enabled) return false;

    return [
      {
        kinds: [30911 as number],
        limit: SIMPLE_FETCH_LIMIT,
      },
    ];
  }, [enabled]);

  const gFanoutFilter = useMemo((): NDKFilter[] | false => {
    if (dvmEnabled) {
      return false;
    }

    if (!enabled || nearbyGTags.length === 0) {
      return false;
    }

    return [
      {
        kinds: [30911 as number],
        '#g': nearbyGTags,
        limit: SIMPLE_FETCH_LIMIT,
      },
    ];
  }, [enabled, nearbyGTags, dvmEnabled]);

  useEffect(() => {
    let cancelled = false;

    async function publishDvmRequest() {
      if (!dvmEnabled || !location) {
        if (dvmRequestId !== null) {
          setDvmRequestId(null);
        }
        dvmRequestKeyRef.current = 'none';
        return;
      }

      const [lng, lat] = location;
      const requestKey = `${quantizeCoordinate(lat)},${quantizeCoordinate(lng)}`;
      if (requestKey === dvmRequestKeyRef.current) {
        return;
      }

      dvmRequestKeyRef.current = requestKey;
      const now = Math.floor(Date.now() / 1000);
      const since = now - DVM_DEFAULT_SINCE_DAYS * 24 * 60 * 60;

      const requestEvent = new NDKEvent(ndk);
      requestEvent.kind = DVM_REQUEST_KIND;
      requestEvent.content = '';
      requestEvent.tags = [
        ['param', 'lat', String(lat)],
        ['param', 'lng', String(lng)],
        ['param', 'radius_miles', String(DVM_DEFAULT_RADIUS_MILES)],
        ['param', 'since', String(since)],
        ['param', 'max_results', String(DVM_DEFAULT_MAX_RESULTS)],
        ['param', 'sort_profile', 'distance_then_recent'],
        ['param', 'response_mode', getDvmResponseMode()],
      ];

      try {
        if (!ndk.signer) {
          if (__DEV__) {
            console.warn('[IncidentSub][DVM] signer unavailable; skipping DVM request publish');
          }
          setDvmRequestId(null);
          return;
        }

        await requestEvent.sign();
        await requestEvent.publish();
        if (!cancelled) {
          setDvmRequestId(requestEvent.id);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[IncidentSub][DVM] Failed to publish DVM request', error);
        }
        if (!cancelled) {
          setDvmRequestId(null);
        }
      }
    }

    publishDvmRequest();

    return () => {
      cancelled = true;
    };
  }, [dvmEnabled, dvmRequestId, location]);

  const dvmResultFilter = useMemo((): NDKFilter[] | false => {
    if (!dvmEnabled || !dvmRequestId) {
      return false;
    }

    return [
      {
        kinds: [DVM_RESULT_KIND as number],
        '#e': [dvmRequestId],
        limit: 10,
      },
    ];
  }, [dvmEnabled, dvmRequestId]);

  const filterKey = useMemo(() => {
    if (!enabled) {
      return 'disabled';
    }
    return `global:${SIMPLE_FETCH_LIMIT}`;
  }, [enabled]);

  const locationKey = useMemo(() => {
    if (!location) {
      return 'none';
    }
    return `${location[0]},${location[1]}`;
  }, [location]);

  const incidentSubscriptionOptions = useMemo(
    () => ({
      // In DVM mode we want a bounded snapshot from incidents and let DVM drive ranking.
      // Keeping this live causes unbounded event growth and UI churn on mobile.
      closeOnEose: dvmEnabled,
      bufferMs: 100,
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
      groupable: false, // Execute immediately, avoid timer race on cleanup
    }),
    [dvmEnabled]
  );

  const dvmSubscriptionOptions = useMemo(
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
  const { events: globalEvents, eose: globalEose } = useSubscribe(
    globalFilter,
    incidentSubscriptionOptions
  );
  const { events: gFanoutEvents, eose: gFanoutEose } = useSubscribe(
    gFanoutFilter,
    incidentSubscriptionOptions
  );
  const { events: dvmResultEvents } = useSubscribe(dvmResultFilter, dvmSubscriptionOptions);

  const events = useMemo(() => {
    if (gFanoutEvents.length === 0) {
      return globalEvents;
    }

    const deduped = new Map<string, NDKEvent>();
    for (const event of globalEvents) {
      deduped.set((event as NDKEvent).id, event as NDKEvent);
    }
    for (const event of gFanoutEvents) {
      deduped.set((event as NDKEvent).id, event as NDKEvent);
    }
    return Array.from(deduped.values());
  }, [globalEvents, gFanoutEvents]);

  const eose = globalEose && (gFanoutFilter === false || gFanoutEose);

  const dvmOrderedEventIds = useMemo(() => {
    if (!dvmEnabled || !dvmRequestId || dvmResultEvents.length === 0) {
      return [];
    }

    const latestResult = [...dvmResultEvents]
      .filter((event) => (event as NDKEvent).kind === DVM_RESULT_KIND)
      .sort((a, b) => ((b as NDKEvent).created_at || 0) - ((a as NDKEvent).created_at || 0))[0];

    if (!latestResult) {
      return [];
    }

    return extractDvmIncidentEventIds(latestResult as NDKEvent, dvmRequestId);
  }, [dvmEnabled, dvmRequestId, dvmResultEvents]);

  // Debug: Track event count changes to see cache vs relay timing
  const prevEventCountForDebug = useRef(0);
  const subscriptionStartTime = useRef(Date.now());
  const loggedEoseForCycleRef = useRef(false);

  useEffect(() => {
    if (!DEBUG_CACHE) return;

    if (globalFilter && prevEventCountForDebug.current === 0 && events.length === 0) {
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
  }, [events.length, eose, globalFilter]);

  // Debug: Log EOSE once per subscription cycle.
  useEffect(() => {
    if (!DEBUG_CACHE) return;

    if (!eose) {
      loggedEoseForCycleRef.current = false;
      return;
    }

    if (!loggedEoseForCycleRef.current) {
      loggedEoseForCycleRef.current = true;
      const elapsed = Date.now() - subscriptionStartTime.current;
      console.log(`✅ [IncidentSub] EOSE received @ ${elapsed}ms (${events.length} total events)`);
    }
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
      nearbyGTagsKeyRef.current = '';
      if (nearbyGTags.length > 0) {
        setNearbyGTags([]);
      }
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
      let displayOrdered = sorted;
      if (location) {
        const maxDistanceMeters = clampRadiusMiles(displayRadiusMiles) * METERS_PER_MILE;
        displayOrdered = sorted.filter((incident) => {
          const distanceMeters = distanceFromLocationMeters(incident, location);
          return Number.isFinite(distanceMeters) && distanceMeters <= maxDistanceMeters;
        });
      }

      if (dvmEnabled && dvmOrderedEventIds.length > 0) {
        const byEventId = new Map(displayOrdered.map((incident) => [incident.eventId, incident]));
        const preferred = dvmOrderedEventIds
          .map((eventId) => byEventId.get(eventId))
          .filter((incident): incident is ProcessedIncident => Boolean(incident));
        const preferredSet = new Set(preferred.map((incident) => incident.eventId));
        const remainder = displayOrdered.filter((incident) => !preferredSet.has(incident.eventId));
        displayOrdered = [...preferred, ...remainder];
      }

      const sliced = displayOrdered.slice(0, effectiveMaxIncidents);
      const nextNearbyGTags = buildNearbyGTagFilterValues(
        Array.from(incidentMapRef.current.values()),
        location
      );
      const nextNearbyGTagsKey = nextNearbyGTags.join('|');
      if (nextNearbyGTagsKey !== nearbyGTagsKeyRef.current) {
        nearbyGTagsKeyRef.current = nextNearbyGTagsKey;
        setNearbyGTags(nextNearbyGTags);
      }

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
    nearbyGTags.length,
    dvmEnabled,
    dvmOrderedEventIds,
    displayRadiusMiles,
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
