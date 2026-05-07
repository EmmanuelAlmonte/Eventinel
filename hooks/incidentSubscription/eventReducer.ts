import type { NDKEvent } from '@nostr-dev-kit/mobile';

import { parseIncidentEvent } from '@lib/nostr/events/incident';
import { shouldReplaceIncidentByMetadata } from './incidentReplacementOrdering';
import { type EventBatchInput, type EventBatchResult, INCIDENT_KIND } from './types';
import { toProcessedIncident, sortIncidentsForDisplay, sortIncidentsForRetention } from './sorting';
import type { ProcessedIncident } from './types';

type IncidentEventReducerMetrics = {
  totalBatches: number;
  totalQueuedEvents: number;
  totalRelevantEvents: number;
  totalCacheEvents: number;
  totalRelayEvents: number;
  totalParsedEvents: number;
  parseSkips: number;
  parseFailures: number;
  replacements: number;
  updatesApplied: number;
  parseCandidateDrops: number;
  retentionTrimEvents: number;
  totalBatchMs: number;
  peakBatchMs: number;
  totalParseMs: number;
  cachePruned: number;
};

type IncidentBatchPartition = {
  candidates: QueuedEventCandidate[];
  totalRelevantEvents: number;
  cacheCount: number;
  relayCount: number;
  parseSkips: number;
};

type IncidentEventParseResult = {
  incidentMap: Map<string, ProcessedIncident>;
  updatedIncidents: ProcessedIncident[];
  didUpdate: boolean;
  parsedEvents: number;
  parseFailures: number;
};

type QueuedEventCandidate = {
  event: NDKEvent;
  source: 'cache' | 'relay';
  incidentId?: string;
  createdAt?: number;
  eventId?: string;
  rawEventCount?: number;
  cacheEventCount?: number;
  relayEventCount?: number;
};

const DEBUG_INCIDENT_REDUCTION_PERF =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_INCIDENT_SUBSCRIPTION_PERF === '1';

const REDUCTION_METRICS: IncidentEventReducerMetrics = {
  totalBatches: 0,
  totalQueuedEvents: 0,
  totalRelevantEvents: 0,
  totalCacheEvents: 0,
  totalRelayEvents: 0,
  totalParsedEvents: 0,
  parseSkips: 0,
  parseFailures: 0,
  replacements: 0,
  updatesApplied: 0,
  parseCandidateDrops: 0,
  retentionTrimEvents: 0,
  totalBatchMs: 0,
  peakBatchMs: 0,
  totalParseMs: 0,
  cachePruned: 0,
};

const INCOMING_PARSE_HOT_FIELD = 'created_at';

function getIncidentIdFromEventTags(event: NDKEvent): string | null {
  for (const tag of event.tags ?? []) {
    if (!Array.isArray(tag) || tag.length < 2) {
      continue;
    }
    if (tag[0] !== 'd') {
      continue;
    }
    if (typeof tag[1] === 'string') {
      return tag[1];
    }
  }
  return null;
}

function getIncomingCreatedAt(event: NDKEvent): number | null {
  if (typeof event[INCOMING_PARSE_HOT_FIELD] !== 'number') {
    return null;
  }
  return event[INCOMING_PARSE_HOT_FIELD];
}

export function getIncidentEventReducerMetrics(): IncidentEventReducerMetrics {
  return { ...REDUCTION_METRICS };
}

export function resetIncidentEventReducerMetrics(): void {
  REDUCTION_METRICS.totalBatches = 0;
  REDUCTION_METRICS.totalQueuedEvents = 0;
  REDUCTION_METRICS.totalRelevantEvents = 0;
  REDUCTION_METRICS.totalCacheEvents = 0;
  REDUCTION_METRICS.totalRelayEvents = 0;
  REDUCTION_METRICS.totalParsedEvents = 0;
  REDUCTION_METRICS.parseSkips = 0;
  REDUCTION_METRICS.parseFailures = 0;
  REDUCTION_METRICS.replacements = 0;
  REDUCTION_METRICS.updatesApplied = 0;
  REDUCTION_METRICS.parseCandidateDrops = 0;
  REDUCTION_METRICS.retentionTrimEvents = 0;
  REDUCTION_METRICS.totalBatchMs = 0;
  REDUCTION_METRICS.peakBatchMs = 0;
  REDUCTION_METRICS.totalParseMs = 0;
  REDUCTION_METRICS.cachePruned = 0;
}

function recordEventSource(
  sample: QueuedEventCandidate,
  metricsInput: IncidentEventReducerMetrics
): { rawEventCount: number; cacheEventCount: number; relayEventCount: number } {
  const rawEventCount = sample.rawEventCount ?? 1;
  const cacheEventCount =
    sample.cacheEventCount ?? (sample.source === 'cache' ? rawEventCount : 0);
  const relayEventCount =
    sample.relayEventCount ?? (sample.source === 'relay' ? rawEventCount : 0);

  metricsInput.totalCacheEvents += cacheEventCount;
  metricsInput.totalRelayEvents += relayEventCount;

  return { rawEventCount, cacheEventCount, relayEventCount };
}

function partitionIncidentCandidates(
  queuedEvents: EventBatchInput['queuedEvents'],
  incidentMap: EventBatchInput['incidentMap'],
  metricsInput: IncidentEventReducerMetrics,
  minCreatedAtUnixSeconds: number | null | undefined,
  maxParseCandidates: number | null | undefined
): IncidentBatchPartition {
  const candidates: QueuedEventCandidate[] = [];
  let totalRelevantEvents = 0;
  let cacheCount = 0;
  let relayCount = 0;
  let parseSkips = 0;

  for (const queued of queuedEvents) {
    const candidate = queued as QueuedEventCandidate;
    const { event, source } = candidate;

    if (event.kind !== INCIDENT_KIND) {
      continue;
    }

    const incidentTag = candidate.incidentId ?? getIncidentIdFromEventTags(event);
    const incomingCreatedAt = candidate.createdAt ?? getIncomingCreatedAt(event);
    const incomingEventId =
      candidate.eventId ?? (typeof event.id === 'string' ? event.id : '');

    if (
      typeof minCreatedAtUnixSeconds === 'number' &&
      Number.isFinite(minCreatedAtUnixSeconds) &&
      incomingCreatedAt != null &&
      incomingCreatedAt < minCreatedAtUnixSeconds
    ) {
      continue;
    }

    const sourceMetrics = recordEventSource(candidate, metricsInput);
    totalRelevantEvents += sourceMetrics.rawEventCount;
    cacheCount += sourceMetrics.cacheEventCount;
    relayCount += sourceMetrics.relayEventCount;

    if (incidentTag && incomingCreatedAt != null && incomingEventId) {
      const existing = incidentMap.get(incidentTag);
      if (
        !shouldReplaceIncidentByMetadata(existing, {
          createdAt: incomingCreatedAt,
          eventId: incomingEventId,
        })
      ) {
        parseSkips += 1;
        metricsInput.parseSkips += 1;
        continue;
      }
    }

    candidates.push(candidate);
  }

  const normalizedMaxParseCandidates =
    typeof maxParseCandidates === 'number' && Number.isFinite(maxParseCandidates)
      ? Math.max(0, Math.floor(maxParseCandidates))
      : candidates.length;

  if (candidates.length <= normalizedMaxParseCandidates) {
    return { candidates, totalRelevantEvents, cacheCount, relayCount, parseSkips };
  }

  const cappedCandidates = [...candidates]
    .sort((left, right) => {
      const leftCreatedAt = left.createdAt ?? getIncomingCreatedAt(left.event) ?? 0;
      const rightCreatedAt = right.createdAt ?? getIncomingCreatedAt(right.event) ?? 0;
      if (leftCreatedAt !== rightCreatedAt) {
        return rightCreatedAt - leftCreatedAt;
      }

      const leftEventId =
        left.eventId ?? (typeof left.event.id === 'string' ? left.event.id : '');
      const rightEventId =
        right.eventId ?? (typeof right.event.id === 'string' ? right.event.id : '');

      return rightEventId.localeCompare(leftEventId);
    })
    .slice(0, normalizedMaxParseCandidates);

  metricsInput.parseCandidateDrops += candidates.length - cappedCandidates.length;

  return {
    candidates: cappedCandidates,
    totalRelevantEvents,
    cacheCount,
    relayCount,
    parseSkips,
  };
}

function applyIncidentEventUpdates(
  candidates: readonly QueuedEventCandidate[],
  incidentMap: EventBatchInput['incidentMap'],
  metricsInput: IncidentEventReducerMetrics,
  minCreatedAtUnixSeconds: number | null | undefined,
  authorBlossomServerUrlsByPubkey: EventBatchInput['authorBlossomServerUrlsByPubkey']
): IncidentEventParseResult {
  let nextIncidentMap = incidentMap;
  const updatedIncidentMap = new Map<string, ProcessedIncident>();
  let didUpdate = false;
  let parsedEvents = 0;
  let parseFailures = 0;
  let hasMapClone = false;

  for (const queued of candidates) {
    const parseStart = Date.now();
    const authorBlossomServerUrls =
      queued.event.pubkey && authorBlossomServerUrlsByPubkey?.get(queued.event.pubkey);
    const parsed =
      authorBlossomServerUrls && authorBlossomServerUrls.length > 0
        ? parseIncidentEvent(queued.event, { authorBlossomServerUrls })
        : parseIncidentEvent(queued.event);
    const parseMs = Date.now() - parseStart;
    metricsInput.totalParseMs += parseMs;
    parsedEvents += 1;
    metricsInput.totalParsedEvents += 1;

    if (!parsed) {
      parseFailures += 1;
      metricsInput.parseFailures += 1;
      continue;
    }

    const processed = toProcessedIncident(parsed);
    if (
      typeof minCreatedAtUnixSeconds === 'number' &&
      Number.isFinite(minCreatedAtUnixSeconds) &&
      processed.createdAtMs < minCreatedAtUnixSeconds * 1000
    ) {
      continue;
    }
    const existing = nextIncidentMap.get(parsed.incidentId);
    const shouldReplace = shouldReplaceIncidentByMetadata(existing, {
      createdAt: parsed.createdAt,
      eventId: parsed.eventId,
    });

    if (!shouldReplace) {
      continue;
    }

    if (!hasMapClone) {
      nextIncidentMap = new Map(nextIncidentMap);
      hasMapClone = true;
    }

    metricsInput.replacements += 1;
    nextIncidentMap.set(parsed.incidentId, processed);
    if (updatedIncidentMap.has(parsed.incidentId)) {
      updatedIncidentMap.delete(parsed.incidentId);
    }
    updatedIncidentMap.set(parsed.incidentId, processed);
    didUpdate = true;
    metricsInput.updatesApplied += 1;
  }

  return {
    incidentMap: nextIncidentMap,
    updatedIncidents: Array.from(updatedIncidentMap.values()),
    didUpdate,
    parsedEvents,
    parseFailures,
  };
}

function applyRetentionLimit(
  incidentMap: EventBatchInput['incidentMap'],
  maxCandidateRetention: number,
  location: EventBatchInput['location'],
  metricsInput: IncidentEventReducerMetrics
): { incidentMap: EventBatchInput['incidentMap']; retentionTrimEvents: number } {
  if (incidentMap.size <= maxCandidateRetention) {
    return { incidentMap, retentionTrimEvents: 0 };
  }

  const retained = location
    ? sortIncidentsForDisplay(Array.from(incidentMap.values()), location).slice(
        0,
        maxCandidateRetention
      )
    : sortIncidentsForRetention(Array.from(incidentMap.values())).slice(
        0,
        maxCandidateRetention
      );

  if (retained.length === incidentMap.size) {
    return { incidentMap, retentionTrimEvents: 0 };
  }

  const trimmedMap = new Map(retained.map((incident) => [incident.incidentId, incident]));
  const retentionTrimEvents = incidentMap.size - retained.length;
  metricsInput.retentionTrimEvents += retentionTrimEvents;
  return { incidentMap: trimmedMap, retentionTrimEvents };
}

export function applyIncidentEventBatch(input: EventBatchInput): EventBatchResult {
  const batchStart = Date.now();
  REDUCTION_METRICS.totalBatches += 1;
  REDUCTION_METRICS.totalQueuedEvents += input.queuedEvents.length;

  let nextIncidentMap = input.incidentMap;
  const updatedIncidents: ProcessedIncident[] = [];
  let didUpdate = false;
  let totalRelevantEvents = 0;
  let cacheCount = 0;
  let relayCount = 0;
  let parsedEvents = 0;
  let parseSkips = 0;
  let parseFailures = 0;
  let retentionTrimEvents = 0;

  try {
    const partitioned = partitionIncidentCandidates(
      input.queuedEvents,
      input.incidentMap,
      REDUCTION_METRICS,
      input.minCreatedAtUnixSeconds,
      input.maxParseCandidates
    );
    totalRelevantEvents = partitioned.totalRelevantEvents;
    cacheCount = partitioned.cacheCount;
    relayCount = partitioned.relayCount;
    parseSkips = partitioned.parseSkips;

    const parsed = applyIncidentEventUpdates(
      partitioned.candidates,
      input.incidentMap,
      REDUCTION_METRICS,
      input.minCreatedAtUnixSeconds,
      input.authorBlossomServerUrlsByPubkey
    );
    nextIncidentMap = parsed.incidentMap;
    updatedIncidents.push(...parsed.updatedIncidents);
    didUpdate = parsed.didUpdate;
    parsedEvents = parsed.parsedEvents;
    parseFailures = parsed.parseFailures;

    if (totalRelevantEvents === 0) {
      return {
        incidentMap: input.incidentMap,
        totalRelevantEvents,
        cacheCount,
        relayCount,
        updatedIncidents,
        didUpdate: false,
      };
    }

    const retained = applyRetentionLimit(
      nextIncidentMap,
      input.maxCandidateRetention,
      input.location,
      REDUCTION_METRICS
    );
    nextIncidentMap = retained.incidentMap;
    retentionTrimEvents = retained.retentionTrimEvents;

    return {
      incidentMap: nextIncidentMap,
      totalRelevantEvents,
      cacheCount,
      relayCount,
      updatedIncidents,
      didUpdate,
    };
  } finally {
    const batchDurationMs = Date.now() - batchStart;
    REDUCTION_METRICS.totalBatchMs += batchDurationMs;
    if (batchDurationMs > REDUCTION_METRICS.peakBatchMs) {
      REDUCTION_METRICS.peakBatchMs = batchDurationMs;
    }
    REDUCTION_METRICS.totalRelevantEvents += totalRelevantEvents;

    if (DEBUG_INCIDENT_REDUCTION_PERF && totalRelevantEvents > 0) {
      console.debug(
        `[IncidentReducerPerf] batch=+${input.queuedEvents.length} relevant=${totalRelevantEvents} parsed=${parsedEvents} parseSkips=${parseSkips} parseFailures=${parseFailures} updates=${updatedIncidents.length} retentionTrim=${retentionTrimEvents} durationMs=${batchDurationMs}`
      );
    }
  }
}

export type { EventBatchInput, EventBatchResult };
