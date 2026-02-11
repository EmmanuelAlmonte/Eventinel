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
import type { Severity } from '@lib/nostr/config';

// Debug flag - set to true to enable cache debugging logs
const DEBUG_CACHE = __DEV__;
const EMPTY_SEVERITY_COUNTS: Record<Severity, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const SIMPLE_FETCH_LIMIT = 200;

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

export interface UseIncidentSubscriptionOptions {
  /** Kept for call-site compatibility. Unused in global fetch mode. */
  location: [number, number] | null;
  /** Whether subscription is enabled */
  enabled?: boolean;
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
  location: _location,
  enabled = true,
  maxIncidents = SIMPLE_FETCH_LIMIT,
}: UseIncidentSubscriptionOptions): UseIncidentSubscriptionResult {
  const effectiveMaxIncidents = Math.min(maxIncidents, SIMPLE_FETCH_LIMIT);
  const lastUpdatedRef = useRef<number | null>(null);
  const incidentMapRef = useRef<Map<string, ProcessedIncident>>(new Map());
  const lastEventCountRef = useRef(0);
  const lastFilterKeyRef = useRef<string | null>(null);
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

  // Build NDK filter
  const filter = useMemo((): NDKFilter[] | false => {
    if (!enabled) return false;

    return [
      {
        kinds: [30911 as number],
        limit: SIMPLE_FETCH_LIMIT,
      },
    ];
  }, [enabled]);

  const filterKey = useMemo(() => {
    if (!enabled) {
      return 'disabled';
    }
    return `global:${SIMPLE_FETCH_LIMIT}`;
  }, [enabled]);

  // Subscribe with explicit CACHE_FIRST to ensure cached events load immediately.
  // groupable: false - Prevents NDK timer race condition that causes "No filters to merge"
  // error when subscription is stopped before EOSE (see NDK removeItem bug).
  const { events, eose } = useSubscribe(filter, {
    closeOnEose: false,
    bufferMs: 100,
    cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
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
      lastUpdatedRef.current = null;
      lastMaxIncidentsRef.current = effectiveMaxIncidents;
      return;
    }

    const filterChanged = lastFilterKeyRef.current !== filterKey;
    const eventsShrunk = events.length < lastEventCountRef.current;
    let reset = filterChanged || eventsShrunk;
    lastFilterKeyRef.current = filterKey;

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
      if (!existing || parsed.createdAt > existing.createdAt) {
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

    if (didUpdate || reset || maxChanged) {
      const sorted = Array.from(incidentMapRef.current.values()).sort(
        (a, b) => b.occurredAtMs - a.occurredAtMs
      );

      const sliced = sorted.slice(0, effectiveMaxIncidents);

      if (incidentMapRef.current.size > effectiveMaxIncidents) {
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
    effectiveMaxIncidents,
    filterKey,
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
