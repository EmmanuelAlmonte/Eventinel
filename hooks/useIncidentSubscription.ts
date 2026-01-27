/**
 * useIncidentSubscription Hook
 *
 * Handles NDK subscription for incident events with deduplication,
 * sorting, and severity counting.
 */

import { useMemo, useRef, useEffect, useCallback } from 'react';
import geohash from 'ngeohash';
import { useSubscribe, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/mobile';
import type { NDKFilter } from '@nostr-dev-kit/mobile';
import { parseIncidentEvent } from '@lib/nostr/events/incident';
import type { ParsedIncident } from '@lib/nostr/events/types';
import type { Severity } from '@lib/nostr/config';
import { DEFAULT_GEOHASH_PRECISION } from '@lib/nostr/config';
import { INCIDENT_LIMITS } from '@lib/map/constants';

// Debug flag - set to true to enable cache debugging logs
const DEBUG_CACHE = __DEV__;

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

  // Build NDK filter
  const filter = useMemo((): NDKFilter[] | false => {
    if (!enabled || !geohashes) return false;

    const sinceTimestamp = Math.floor(Date.now() / 1000) - sinceDays * 86400;

    return [
      {
        kinds: [30911 as number],
        '#g': geohashes,
        '#t': ['incident'],
        since: sinceTimestamp,
        limit: INCIDENT_LIMITS.FETCH_LIMIT,
      },
    ];
  }, [enabled, geohashes, sinceDays]);

  // Subscribe with explicit CACHE_FIRST to ensure cached events load immediately
  // WORKAROUND: ndk-mobile cache has a bug where events.id uses tagAddress format
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

  // Parse, dedup, sort, slice, then count
  const result = useMemo(() => {
    const incidentMap = new Map<string, ProcessedIncident>();

    for (const event of events) {
      const parsed = parseIncidentEvent(event);
      if (!parsed) continue;

      // Compute timestamps
      const createdAtMs = parsed.createdAt * 1000;
      const occurredAtMs =
        parsed.occurredAt instanceof Date && !Number.isNaN(parsed.occurredAt.getTime())
          ? parsed.occurredAt.getTime()
          : createdAtMs; // Fallback to createdAt if invalid

      const processed: ProcessedIncident = {
        ...parsed,
        createdAtMs,
        occurredAtMs,
      };

      // Dedup by incidentId, keep LATEST by createdAt
      const existing = incidentMap.get(parsed.incidentId);
      if (!existing || parsed.createdAt > existing.createdAt) {
        incidentMap.set(parsed.incidentId, processed);
      }
    }

    // Sort by occurredAt (when incident happened), newest first
    const sorted = Array.from(incidentMap.values()).sort(
      (a, b) => b.occurredAtMs - a.occurredAtMs
    );

    // Slice to max
    const sliced = sorted.slice(0, maxIncidents);

    // Compute counts from DISPLAYED list (post-slice)
    const severityCounts: SeverityCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const incident of sliced) {
      severityCounts[incident.severity]++;
    }

    return {
      incidents: sliced,
      severityCounts,
      totalEventsReceived: events.length,
    };
  }, [events, maxIncidents]);

  // Track lastUpdated in useEffect (NOT inside useMemo - that's a side effect)
  const prevEventCountRef = useRef(0);
  useEffect(() => {
    if (events.length > prevEventCountRef.current) {
      lastUpdatedRef.current = Date.now();
    }
    prevEventCountRef.current = events.length;
  }, [events.length]);

  return {
    ...result,
    isInitialLoading: !eose,
    hasReceivedHistory: eose,
    lastUpdatedAt: lastUpdatedRef.current,
  };
}
