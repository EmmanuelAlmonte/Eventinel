import type { NDKEvent } from '@nostr-dev-kit/mobile';

import { parseIncidentEvent } from '@lib/nostr/events/incident';
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
  retentionTrimEvents: number;
  totalBatchMs: number;
  peakBatchMs: number;
  totalParseMs: number;
  cachePruned: number;
};

type QueuedEventCandidate = {
  event: NDKEvent;
  source: 'cache' | 'relay';
  incidentId?: string;
  createdAt?: number;
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

function shouldReplaceExistingEventByMetadata(
  existing: ReturnType<EventBatchInput['incidentMap']['get']>,
  incomingCreatedAt: number,
  incomingEventId: string
): boolean {
  if (!existing) return true;
  if (incomingCreatedAt > existing.createdAt) return true;
  if (incomingCreatedAt === existing.createdAt) {
    return incomingEventId.localeCompare(existing.eventId) > 0;
  }
  return false;
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
  REDUCTION_METRICS.retentionTrimEvents = 0;
  REDUCTION_METRICS.totalBatchMs = 0;
  REDUCTION_METRICS.peakBatchMs = 0;
  REDUCTION_METRICS.totalParseMs = 0;
  REDUCTION_METRICS.cachePruned = 0;
}

function recordEventSource(sample: QueuedEventCandidate, metricsInput: IncidentEventReducerMetrics): void {
  if (sample.source === 'cache') {
    metricsInput.totalCacheEvents += 1;
  } else {
    metricsInput.totalRelayEvents += 1;
  }
}

function shouldReplaceExistingIncident(
  existing: ReturnType<EventBatchInput['incidentMap']['get']>,
  incoming: { createdAt: number; eventId: string }
): boolean {
  if (!existing) {
    return true;
  }

  if (incoming.createdAt > existing.createdAt) {
    return true;
  }

  if (incoming.createdAt === existing.createdAt) {
    return incoming.eventId.localeCompare(existing.eventId) > 0;
  }

  return false;
}

export function applyIncidentEventBatch(input: EventBatchInput): EventBatchResult {
  const batchStart = Date.now();
  REDUCTION_METRICS.totalBatches += 1;
  REDUCTION_METRICS.totalQueuedEvents += input.queuedEvents.length;

  let nextIncidentMap = new Map(input.incidentMap);
  const updatedIncidents: ProcessedIncident[] = [];
  let didUpdate = false;
  let totalRelevantEvents = 0;
  let cacheCount = 0;
  let relayCount = 0;
  let parsedEvents = 0;
  let parseSkips = 0;
  let parseFailures = 0;
  let retentionTrimEvents = 0;

  for (const queued of input.queuedEvents) {
    const { event, source } = queued as QueuedEventCandidate;
    const incidentTag = getIncidentIdFromEventTags(event);
    const incomingCreatedAt = getIncomingCreatedAt(event);

    if (event.kind !== INCIDENT_KIND) {
      continue;
    }

    totalRelevantEvents += 1;
    if (source === 'cache') {
      cacheCount += 1;
    } else {
      relayCount += 1;
    }
    recordEventSource(queued, REDUCTION_METRICS);

    const incomingEventId = typeof event.id === 'string' ? event.id : '';

    if (incidentTag && incomingCreatedAt != null && incomingEventId) {
      const existing = nextIncidentMap.get(incidentTag);
      if (!shouldReplaceExistingEventByMetadata(existing, incomingCreatedAt, incomingEventId)) {
        parseSkips += 1;
        REDUCTION_METRICS.parseSkips += 1;
        continue;
      }
    }

    const parseStart = Date.now();
    const parsed = parseIncidentEvent(event);
    const parseMs = Date.now() - parseStart;
    REDUCTION_METRICS.totalParseMs += parseMs;
    parsedEvents += 1;
    REDUCTION_METRICS.totalParsedEvents += 1;

    if (!parsed) {
      parseFailures += 1;
      REDUCTION_METRICS.parseFailures += 1;
      continue;
    }

    const processed = toProcessedIncident(parsed);
    const existing = nextIncidentMap.get(parsed.incidentId);
    const shouldReplace = shouldReplaceExistingIncident(existing, {
      createdAt: parsed.createdAt,
      eventId: parsed.eventId,
    });

    if (shouldReplace) {
      REDUCTION_METRICS.replacements += 1;
      nextIncidentMap = new Map(nextIncidentMap);
      nextIncidentMap.set(parsed.incidentId, processed);
      updatedIncidents.push(processed);
      didUpdate = true;
      REDUCTION_METRICS.updatesApplied += 1;
    }
  }

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

  if (nextIncidentMap.size > input.maxCandidateRetention) {
    const retained = input.location
      ? sortIncidentsForDisplay(Array.from(nextIncidentMap.values()), input.location).slice(
          0,
          input.maxCandidateRetention
        )
      : sortIncidentsForRetention(Array.from(nextIncidentMap.values())).slice(
          0,
          input.maxCandidateRetention
        );

    if (retained.length !== nextIncidentMap.size) {
      retentionTrimEvents = nextIncidentMap.size - retained.length;
      REDUCTION_METRICS.retentionTrimEvents += retentionTrimEvents;
      nextIncidentMap = new Map(retained.map((incident) => [incident.incidentId, incident]));
    }
  }

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

  return {
    incidentMap: nextIncidentMap,
    totalRelevantEvents,
    cacheCount,
    relayCount,
    updatedIncidents,
    didUpdate,
  };
}

export type { EventBatchInput, EventBatchResult };
