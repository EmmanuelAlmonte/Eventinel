/**
 * useIncidentSubscription Hook
 *
 * Handles NDK subscription for incident events with deduplication,
 * sorting, and severity counting.
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import geohash from 'ngeohash';
import { useSubscribe, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/mobile';
import type { NDKEvent, NDKFilter } from '@nostr-dev-kit/mobile';
import { parseIncidentEvent, parseGeolocation, getTagValue, getTagValues } from '@lib/nostr/events/incident';
import type { ParsedIncident } from '@lib/nostr/events/types';
import type { Severity } from '@lib/nostr/config';
import { DEFAULT_GEOHASH_PRECISION, EVENTINEL_TAGS, TAGS } from '@lib/nostr/config';
import { INCIDENT_LIMITS } from '@lib/map/constants';

// Debug flag - set to true to enable cache debugging logs
const DEBUG_CACHE = __DEV__;
const EMPTY_SEVERITY_COUNTS: Record<Severity, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

/**
 * Extended incident with precomputed timestamps for safe sorting
 */
export interface ProcessedIncident extends ParsedIncident {
  /** createdAt in milliseconds */
  createdAtMs: number;
  /** occurredAt in milliseconds (with fallback) */
  occurredAtMs: number;
}

export interface UseIncidentSubscriptionOptions {
  /** User location as [longitude, latitude] */
  location: [number, number] | null;
  /** Whether subscription is enabled */
  enabled?: boolean;
  /** Days of history to fetch */
  sinceDays?: number;
  /** Maximum incidents to return */
  maxIncidents?: number;
}

type SeverityCounts = Record<Severity, number>;

export interface UseIncidentSubscriptionResult {
  /** Parsed incidents (sorted by occurredAt, sliced to max) */
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
  sinceDays = INCIDENT_LIMITS.SINCE_DAYS,
  maxIncidents = INCIDENT_LIMITS.MAX_CACHE,
}: UseIncidentSubscriptionOptions): UseIncidentSubscriptionResult {
  const lastUpdatedRef = useRef<number | null>(null);
  const incidentMapRef = useRef<Map<string, ProcessedIncident>>(new Map());
  const lastEventCountRef = useRef(0);
  const lastFilterKeyRef = useRef<string | null>(null);
  const lastMaxIncidentsRef = useRef(maxIncidents);
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

  // Calculate geohashes for NIP-52 filtering
  const geohashes = useMemo(() => {
    if (!location) return null;

    const userGeohash = geohash.encode(
      location[1], // latitude
      location[0], // longitude
      DEFAULT_GEOHASH_PRECISION
    );
    const neighbors = geohash.neighbors(userGeohash);
    const allGeohashes = [userGeohash, ...Object.values(neighbors)];

    if (DEBUG_CACHE) {
      console.log(`🗺️ [IncidentSub] User location: [${location[0].toFixed(4)}, ${location[1].toFixed(4)}]`);
      console.log(`🗺️ [IncidentSub] User geohash: ${userGeohash} (precision: ${DEFAULT_GEOHASH_PRECISION})`);
      console.log(`🗺️ [IncidentSub] Query geohashes: ${allGeohashes.join(', ')}`);
    }

    return allGeohashes;
  }, [location]);

  const geohashSet = useMemo(() => {
    if (!geohashes) return null;
    return new Set(geohashes);
  }, [geohashes]);

  const sinceTimestamp = useMemo(() => {
    if (!enabled || !geohashes) return null;
    return Math.floor(Date.now() / 1000) - sinceDays * 86400;
  }, [enabled, geohashes, sinceDays]);

  // Build NDK filter
  const filter = useMemo((): NDKFilter[] | false => {
    if (!enabled || !geohashes || sinceTimestamp === null) return false;

    return [
      {
        kinds: [30911 as number],
        '#g': geohashes,
        '#t': ['incident'],
        since: sinceTimestamp,
        limit: INCIDENT_LIMITS.FETCH_LIMIT,
      },
    ];
  }, [enabled, geohashes, sinceTimestamp]);

  const filterKey = useMemo(() => {
    if (!enabled || !geohashes || sinceTimestamp === null) {
      return 'disabled';
    }
    return `${sinceTimestamp}:${geohashes.join(',')}`;
  }, [enabled, geohashes, sinceTimestamp]);

  // Subscribe with explicit CACHE_FIRST to ensure cached events load immediately
  // WORKAROUND: NDK mobile cache has a bug where events.id uses tagAddress format
  // but event_tags.event_id uses actual event ID for replaceable events (kind 30911).
  // This breaks tag-based queries. We use cacheUnconstrainFilter to remove tag
  // filters for cache queries, falling back to kinds-only query which works.
  // The relay query still uses full filters including geohash tags.
  //
  // groupable: false - Prevents NDK timer race condition that causes "No filters to merge"
  // error when subscription is stopped before EOSE (see NDK removeItem bug).
  const { events, eose } = useSubscribe(filter, {
    closeOnEose: false,
    bufferMs: 100,
    cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    cacheUnconstrainFilter: ['#g', '#t', 'since', 'limit'], // Query cache by kinds only
    groupable: false, // Execute immediately, avoid timer race on cleanup
  });

  // Debug: Track event count changes to see cache vs relay timing
  const prevEventCountForDebug = useRef(0);
  const subscriptionStartTime = useRef(Date.now());

  useEffect(() => {
    if (!DEBUG_CACHE) return;

    if (filter && prevEventCountForDebug.current === 0 && events.length === 0) {
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
  }, [events.length, eose, filter]);

  // Debug: Log when EOSE is received
  useEffect(() => {
    if (!DEBUG_CACHE) return;

    if (eose) {
      const elapsed = Date.now() - subscriptionStartTime.current;
      console.log(`✅ [IncidentSub] EOSE received @ ${elapsed}ms (${events.length} total events)`);
    }
  }, [eose, events.length]);

  function matchesIncidentTag(tags: string[][]): boolean {
    const hashtags = getTagValues(tags, TAGS.HASHTAG);
    if (hashtags.length === 0) return true;
    return hashtags.includes(EVENTINEL_TAGS.INCIDENT);
  }

  function matchesGeohash(tags: string[][], set: Set<string>): boolean {
    const geohashTag = getTagValue(tags, TAGS.GEOHASH);
    if (geohashTag && set.has(geohashTag)) {
      return true;
    }

    const geoTag = getTagValue(tags, TAGS.GEOLOCATION);
    const geo = parseGeolocation(geoTag);
    if (!geo) return false;

    const computed = geohash.encode(
      geo.lat,
      geo.lng,
      DEFAULT_GEOHASH_PRECISION
    );
    return set.has(computed);
  }

  function shouldIncludeEvent(
    event: NDKEvent,
    set: Set<string>,
    since: number
  ): boolean {
    const createdAt = event.created_at ?? Math.floor(Date.now() / 1000);
    if (createdAt < since) return false;

    const tags = event.tags ?? [];
    if (!matchesIncidentTag(tags)) return false;
    return matchesGeohash(tags, set);
  }

  useEffect(() => {
    if (!enabled || !geohashSet || sinceTimestamp === null) {
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
      lastUpdatedRef.current = null;
      lastMaxIncidentsRef.current = maxIncidents;
      return;
    }

    let reset = lastFilterKeyRef.current !== filterKey;
    lastFilterKeyRef.current = filterKey;

    if (events.length < lastEventCountRef.current) {
      reset = true;
    }

    if (reset) {
      incidentMapRef.current.clear();
      lastEventCountRef.current = 0;
    }

    const startIndex = reset ? 0 : lastEventCountRef.current;
    const newEvents = events.slice(startIndex);
    const updatedIncidents: ProcessedIncident[] = [];
    let didUpdate = false;

    for (const event of newEvents) {
      if (!shouldIncludeEvent(event, geohashSet, sinceTimestamp)) continue;

      const parsed = parseIncidentEvent(event);
      if (!parsed) continue;

      const createdAtMs = parsed.createdAt * 1000;
      const occurredAtMs =
        parsed.occurredAt instanceof Date && !Number.isNaN(parsed.occurredAt.getTime())
          ? parsed.occurredAt.getTime()
          : createdAtMs;

      const processed: ProcessedIncident = {
        ...parsed,
        createdAtMs,
        occurredAtMs,
      };

      const existing = incidentMapRef.current.get(parsed.incidentId);
      if (!existing || parsed.createdAt > existing.createdAt) {
        incidentMapRef.current.set(parsed.incidentId, processed);
        updatedIncidents.push(processed);
        didUpdate = true;
      }
    }

    lastEventCountRef.current = events.length;

    const maxChanged = lastMaxIncidentsRef.current !== maxIncidents;
    if (maxChanged) {
      lastMaxIncidentsRef.current = maxIncidents;
    }

    const totalChanged = events.length !== lastTotalEventsRef.current;

    if (didUpdate || reset || maxChanged) {
      const sorted = Array.from(incidentMapRef.current.values()).sort(
        (a, b) => b.occurredAtMs - a.occurredAtMs
      );

      const sliced = sorted.slice(0, maxIncidents);

      if (incidentMapRef.current.size > maxIncidents) {
        const keepIds = new Set(sliced.map((incident) => incident.incidentId));
        for (const key of incidentMapRef.current.keys()) {
          if (!keepIds.has(key)) {
            incidentMapRef.current.delete(key);
          }
        }
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
    filterKey,
    geohashSet,
    maxIncidents,
    sinceTimestamp,
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
