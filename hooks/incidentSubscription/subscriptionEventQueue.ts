import type { MutableRefObject } from 'react';
import type { NDKEvent } from '@nostr-dev-kit/mobile';

import { INCIDENT_LIMITS } from '@lib/map/constants';
import { markRelayConfirmedIncident, type RelayConfirmationMapRef } from './cacheConfirmation';
import { shouldReplaceIncidentByMetadata } from './incidentReplacementOrdering';
import { INCIDENT_KIND } from './types';
import type { IncomingEventSource, QueuedEvent } from './types';

type IncidentIntakeMetrics = {
  droppedInvalidKind: number;
  droppedOversizeContent: number;
  droppedMalformedTags: number;
  droppedOversizeEventId: number;
  droppedStaleEvents: number;
  droppedQueueOverflow: number;
  queueCollapses: number;
  peakPendingQueueLength: number;
};

type IntakeDropReason =
  | 'droppedInvalidKind'
  | 'droppedOversizeContent'
  | 'droppedMalformedTags'
  | 'droppedOversizeEventId'
  | 'droppedStaleEvents';

type RawEventValidationResult =
  | {
      ok: true;
      createdAt?: number;
      eventId: string;
      incidentId: string | null;
      queueKey: string;
    }
  | {
      ok: false;
      reason: IntakeDropReason;
    };

const INTAKE_METRICS: IncidentIntakeMetrics = {
  droppedInvalidKind: 0,
  droppedOversizeContent: 0,
  droppedMalformedTags: 0,
  droppedOversizeEventId: 0,
  droppedStaleEvents: 0,
  droppedQueueOverflow: 0,
  queueCollapses: 0,
  peakPendingQueueLength: 0,
};

export function getIncidentIntakeMetrics(): IncidentIntakeMetrics {
  return { ...INTAKE_METRICS };
}

export function resetIncidentIntakeMetrics(): void {
  INTAKE_METRICS.droppedInvalidKind = 0;
  INTAKE_METRICS.droppedOversizeContent = 0;
  INTAKE_METRICS.droppedMalformedTags = 0;
  INTAKE_METRICS.droppedOversizeEventId = 0;
  INTAKE_METRICS.droppedStaleEvents = 0;
  INTAKE_METRICS.droppedQueueOverflow = 0;
  INTAKE_METRICS.queueCollapses = 0;
  INTAKE_METRICS.peakPendingQueueLength = 0;
}

export function clearSubscriptionFlushTimer(
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  flushTimerDelayMsRef: MutableRefObject<number | null>
): void {
  if (flushTimerRef.current) {
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
  }
  flushTimerDelayMsRef.current = null;
}

export function scheduleSubscriptionFlushTimer(
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  flushTimerDelayMsRef: MutableRefObject<number | null>,
  flushQueuedEvents: () => void,
  requestedDelayMs: number
): void {
  const currentDelayMs = flushTimerDelayMsRef.current;
  if (flushTimerRef.current && currentDelayMs != null && currentDelayMs <= requestedDelayMs) {
    return;
  }

  clearSubscriptionFlushTimer(flushTimerRef, flushTimerDelayMsRef);

  flushTimerDelayMsRef.current = requestedDelayMs;
  flushTimerRef.current = setTimeout(() => {
    flushTimerRef.current = null;
    flushTimerDelayMsRef.current = null;
    flushQueuedEvents();
  }, requestedDelayMs);
}

export function enqueueIncidentEvents(
  events: NDKEvent[],
  source: IncomingEventSource,
  pendingEventsRef: MutableRefObject<QueuedEvent[]>,
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  flushTimerDelayMsRef: MutableRefObject<number | null>,
  minCreatedAtUnixSeconds: number,
  flushQueuedEvents: () => void,
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef,
  getBufferDelayMs: (source: IncomingEventSource) => number,
  subscriptionKey?: string
): void {
  if (!events || events.length === 0) {
    return;
  }

  for (const event of events) {
    const validated = validateQueuedIncidentEvent(event, minCreatedAtUnixSeconds);
    if (!validated.ok) {
      INTAKE_METRICS[validated.reason] += 1;
      continue;
    }

    const nextQueuedEvent: QueuedEvent = {
      event,
      source,
      subscriptionKey,
      queueKey: validated.queueKey,
      incidentId: validated.incidentId,
      createdAt: validated.createdAt,
      eventId: validated.eventId,
      rawEventCount: 1,
      cacheEventCount: source === 'cache' ? 1 : 0,
      relayEventCount: source === 'relay' ? 1 : 0,
    };

    if (source === 'relay') {
      markRelayConfirmedIncident(
        relayConfirmedIncidentIdsBySubscriptionKeyRef,
        subscriptionKey,
        validated.incidentId
      );
    }

    const existingIndex = findQueuedEventIndex(
      pendingEventsRef.current,
      validated.queueKey
    );
    if (existingIndex >= 0) {
      const existingQueuedEvent = pendingEventsRef.current[existingIndex];
      if (
        shouldReplaceIncidentByMetadata(
          {
            createdAt: existingQueuedEvent.createdAt ?? 0,
            eventId: existingQueuedEvent.eventId ?? '',
          },
          {
            createdAt: validated.createdAt ?? 0,
            eventId: validated.eventId,
          }
        )
      ) {
        pendingEventsRef.current[existingIndex] = {
          ...nextQueuedEvent,
          rawEventCount: (existingQueuedEvent.rawEventCount ?? 1) + 1,
          cacheEventCount:
            (existingQueuedEvent.cacheEventCount ??
              (existingQueuedEvent.source === 'cache' ? 1 : 0)) +
            (source === 'cache' ? 1 : 0),
          relayEventCount:
            (existingQueuedEvent.relayEventCount ??
              (existingQueuedEvent.source === 'relay' ? 1 : 0)) +
            (source === 'relay' ? 1 : 0),
        };
        INTAKE_METRICS.queueCollapses += 1;
      } else {
        existingQueuedEvent.rawEventCount = (existingQueuedEvent.rawEventCount ?? 1) + 1;
        existingQueuedEvent.cacheEventCount =
          (existingQueuedEvent.cacheEventCount ??
            (existingQueuedEvent.source === 'cache' ? 1 : 0)) +
          (source === 'cache' ? 1 : 0);
        existingQueuedEvent.relayEventCount =
          (existingQueuedEvent.relayEventCount ??
            (existingQueuedEvent.source === 'relay' ? 1 : 0)) +
          (source === 'relay' ? 1 : 0);
      }
      continue;
    }

    if (pendingEventsRef.current.length >= INCIDENT_LIMITS.MAX_PENDING_QUEUE) {
      const droppedQueuedEvent = pendingEventsRef.current.shift();
      INTAKE_METRICS.droppedQueueOverflow += droppedQueuedEvent?.rawEventCount ?? 1;
    }

    pendingEventsRef.current.push(nextQueuedEvent);
    if (pendingEventsRef.current.length > INTAKE_METRICS.peakPendingQueueLength) {
      INTAKE_METRICS.peakPendingQueueLength = pendingEventsRef.current.length;
    }
  }

  scheduleSubscriptionFlushTimer(
    flushTimerRef,
    flushTimerDelayMsRef,
    flushQueuedEvents,
    getBufferDelayMs(source)
  );
}

function getIncidentIdFromTags(tags: NDKEvent['tags']): string | null {
  for (const tag of tags ?? []) {
    if (!Array.isArray(tag) || tag.length < 2) {
      continue;
    }
    if (tag[0] !== 'd') {
      continue;
    }
    if (typeof tag[1] === 'string' && tag[1].length > 0) {
      return tag[1];
    }
  }

  return null;
}

function validateQueuedIncidentEvent(
  event: NDKEvent,
  minCreatedAtUnixSeconds: number
): RawEventValidationResult {
  if (event.kind !== INCIDENT_KIND) {
    return { ok: false, reason: 'droppedInvalidKind' };
  }

  const hasFiniteCreatedAt =
    typeof event.created_at === 'number' && Number.isFinite(event.created_at);
  const normalizedCreatedAt =
    hasFiniteCreatedAt && typeof event.created_at === 'number' ? event.created_at : 0;

  if (hasFiniteCreatedAt && normalizedCreatedAt < minCreatedAtUnixSeconds) {
    return { ok: false, reason: 'droppedStaleEvents' };
  }

  if (
    typeof event.id !== 'string' ||
    event.id.length === 0 ||
    event.id.length > INCIDENT_LIMITS.MAX_EVENT_ID_LENGTH
  ) {
    return { ok: false, reason: 'droppedOversizeEventId' };
  }

  if (
    typeof event.content !== 'string' ||
    event.content.length > INCIDENT_LIMITS.MAX_EVENT_CONTENT_LENGTH
  ) {
    return { ok: false, reason: 'droppedOversizeContent' };
  }

  if (!Array.isArray(event.tags) || event.tags.length > INCIDENT_LIMITS.MAX_EVENT_TAGS) {
    return { ok: false, reason: 'droppedMalformedTags' };
  }

  for (const tag of event.tags) {
    if (!Array.isArray(tag)) {
      return { ok: false, reason: 'droppedMalformedTags' };
    }

    for (const value of tag) {
      if (
        typeof value !== 'string' ||
        value.length > INCIDENT_LIMITS.MAX_EVENT_TAG_VALUE_LENGTH
      ) {
        return { ok: false, reason: 'droppedMalformedTags' };
      }
    }
  }

  const incidentId = getIncidentIdFromTags(event.tags);

  return {
    ok: true,
    createdAt: hasFiniteCreatedAt ? normalizedCreatedAt : undefined,
    eventId: event.id,
    incidentId,
    queueKey: incidentId || event.id,
  };
}

function findQueuedEventIndex(queue: readonly QueuedEvent[], queueKey: string): number {
  for (let index = 0; index < queue.length; index += 1) {
    if (queue[index].queueKey === queueKey) {
      return index;
    }
  }

  return -1;
}
