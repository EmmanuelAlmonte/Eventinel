import { parseIncidentEvent } from '@lib/nostr/events/incident';
import { type EventBatchInput, type EventBatchResult, INCIDENT_KIND } from './types';
import { toProcessedIncident, sortIncidentsForDisplay, sortIncidentsForRetention } from './sorting';
import type { ProcessedIncident } from './types';

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
  let nextIncidentMap = new Map(input.incidentMap);
  const updatedIncidents: ProcessedIncident[] = [];
  let didUpdate = false;
  let totalRelevantEvents = 0;
  let cacheCount = 0;
  let relayCount = 0;

  for (const queued of input.queuedEvents) {
    const { event, source } = queued;
    if (event.kind !== INCIDENT_KIND) {
      continue;
    }

    totalRelevantEvents += 1;
    if (source === 'cache') {
      cacheCount += 1;
    } else {
      relayCount += 1;
    }

    const parsed = parseIncidentEvent(event);
    if (!parsed) {
      continue;
    }

    const processed = toProcessedIncident(parsed);
    const existing = nextIncidentMap.get(parsed.incidentId);
    const shouldReplace = shouldReplaceExistingIncident(existing, {
      createdAt: parsed.createdAt,
      eventId: parsed.eventId,
    });

    if (shouldReplace) {
      nextIncidentMap = new Map(nextIncidentMap);
      nextIncidentMap.set(parsed.incidentId, processed);
      updatedIncidents.push(processed);
      didUpdate = true;
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
      nextIncidentMap = new Map(retained.map((incident) => [incident.incidentId, incident]));
    }
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
