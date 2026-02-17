import type { NDKEvent, NDKFilter } from '@nostr-dev-kit/mobile';
import { NDKSubscriptionCacheUsage } from '@nostr-dev-kit/mobile';
import { ndk } from '@lib/ndk';
import { parseIncidentEvent } from '@lib/nostr/events/incident';
import type { ParsedIncident } from '@lib/nostr/events/types';
import { NOSTR_KINDS } from '@lib/nostr/config';

export type IncidentNotificationPayload = {
  incidentId?: string;
  eventId?: string;
};

type NotificationData = Record<string, unknown>;

type IncNotificationLookupSource = 'eventId' | 'incidentId';

type IncidentNotificationLookupMetrics = {
  totalRequests: number;
  cacheRequests: number;
  cacheHits: number;
  cacheMisses: number;
  relayRequests: number;
  relayResponses: number;
  relayParses: number;
  cacheLookupMsTotal: number;
  relayLookupMsTotal: number;
  cacheLookupMsPeak: number;
  relayLookupMsPeak: number;
  lastLookupMs: number;
};

const DEBUG_NOTIFICATION_PERF =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_INCIDENT_NOTIFICATION_PERF === '1';

const INC_NOTIFICATION_METRICS: IncidentNotificationLookupMetrics = {
  totalRequests: 0,
  cacheRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  relayRequests: 0,
  relayResponses: 0,
  relayParses: 0,
  cacheLookupMsTotal: 0,
  relayLookupMsTotal: 0,
  cacheLookupMsPeak: 0,
  relayLookupMsPeak: 0,
  lastLookupMs: 0,
};

const INCIDENT_NOTIFICATION_RELAY_OPTIONS = {
  cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
};

const LOOKUP_CACHE_TAG = '#d';
const hasSyncCacheLookup = (): boolean => typeof ndk.fetchEventSync === 'function';

function getRecordValue(record: NotificationData, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function getIncidentTagFromEvent(event: NDKEvent): string | undefined {
  for (const tag of event.tags) {
    if (
      Array.isArray(tag) &&
      tag.length >= 2 &&
      tag[0] === LOOKUP_CACHE_TAG.substring(1) &&
      typeof tag[1] === 'string'
    ) {
      return tag[1];
    }
  }
  return undefined;
}

function pickLatestEvent(events: readonly NDKEvent[]): NDKEvent | null {
  let latest: NDKEvent | null = null;
  for (const event of events) {
    if (!latest) {
      latest = event;
      continue;
    }
    if ((event.created_at ?? 0) > (latest.created_at ?? 0)) {
      latest = event;
    }
  }
  return latest;
}

function pickLatestIncidentFromEventsByDTag(
  events: readonly NDKEvent[],
  incidentId: string
): NDKEvent | null {
  let match: NDKEvent | null = null;
  for (const event of events) {
    const eventIncidentId = getIncidentTagFromEvent(event);
    if (eventIncidentId !== incidentId) {
      continue;
    }
    if (!match || (event.created_at ?? 0) > (match.created_at ?? 0)) {
      match = event;
    }
  }
  return match;
}

function logNotificationPerf(label: string): void {
  if (!DEBUG_NOTIFICATION_PERF) {
    return;
  }
  console.debug(
    `[NotificationPerf] ${label} total=${INC_NOTIFICATION_METRICS.totalRequests} cache=${INC_NOTIFICATION_METRICS.cacheHits}/${INC_NOTIFICATION_METRICS.cacheRequests} relay=${INC_NOTIFICATION_METRICS.relayRequests}`
  );
}

export function getIncidentNotificationLookupMetrics(): IncidentNotificationLookupMetrics {
  return { ...INC_NOTIFICATION_METRICS };
}

export function resetIncidentNotificationLookupMetrics(): void {
  INC_NOTIFICATION_METRICS.totalRequests = 0;
  INC_NOTIFICATION_METRICS.cacheRequests = 0;
  INC_NOTIFICATION_METRICS.cacheHits = 0;
  INC_NOTIFICATION_METRICS.cacheMisses = 0;
  INC_NOTIFICATION_METRICS.relayRequests = 0;
  INC_NOTIFICATION_METRICS.relayResponses = 0;
  INC_NOTIFICATION_METRICS.relayParses = 0;
  INC_NOTIFICATION_METRICS.cacheLookupMsTotal = 0;
  INC_NOTIFICATION_METRICS.relayLookupMsTotal = 0;
  INC_NOTIFICATION_METRICS.cacheLookupMsPeak = 0;
  INC_NOTIFICATION_METRICS.relayLookupMsPeak = 0;
  INC_NOTIFICATION_METRICS.lastLookupMs = 0;
}

function trackLookupTiming(
  source: 'cache' | 'relay',
  durationMs: number,
  hasResult: boolean
): void {
  if (source === 'cache') {
    INC_NOTIFICATION_METRICS.cacheLookupMsTotal += durationMs;
    if (durationMs > INC_NOTIFICATION_METRICS.cacheLookupMsPeak) {
      INC_NOTIFICATION_METRICS.cacheLookupMsPeak = durationMs;
    }
  } else {
    INC_NOTIFICATION_METRICS.relayLookupMsTotal += durationMs;
    if (durationMs > INC_NOTIFICATION_METRICS.relayLookupMsPeak) {
      INC_NOTIFICATION_METRICS.relayLookupMsPeak = durationMs;
    }
    INC_NOTIFICATION_METRICS.relayResponses += hasResult ? 1 : 0;
  }
}

function getLookupSourceLabel(source: IncNotificationLookupSource): string {
  return source === 'eventId' ? 'ids' : 'd';
}

function findLatestIncidentInCache(
  payload: IncidentNotificationPayload,
  source: IncNotificationLookupSource
): ParsedIncident | null {
  if (!hasSyncCacheLookup()) {
    return null;
  }

  if (source === 'eventId' && !payload.eventId) {
    return null;
  }
  if (source === 'incidentId' && !payload.incidentId) {
    return null;
  }

  if (source === 'eventId' && payload.eventId) {
    const cached = ndk.fetchEventSync([{ ids: [payload.eventId] }]);
    if (!cached || cached.length === 0) return null;
    const event = pickLatestEvent(cached);
    if (!event) return null;
    return parseIncidentEvent(event);
  }

  const incidentId = payload.incidentId;
  if (!incidentId) {
    return null;
  }

  const cached = ndk.fetchEventSync([
    { kinds: [NOSTR_KINDS.INCIDENT as number], [LOOKUP_CACHE_TAG]: [incidentId] },
  ]);
  if (!cached || cached.length === 0) return null;

  const cachedEvent = pickLatestIncidentFromEventsByDTag(cached, incidentId);
  if (cachedEvent) {
    return parseIncidentEvent(cachedEvent);
  }

  const fallbackEvent = pickLatestEvent(cached);
  return fallbackEvent ? parseIncidentEvent(fallbackEvent) : null;
}

export function coerceIncidentNotificationPayload(
  data: unknown
): IncidentNotificationPayload | null {
  if (!data || typeof data !== 'object') return null;

  const record = data as NotificationData;

  const incidentId =
    getRecordValue(record, 'incidentId') ?? getRecordValue(record, 'incident_id');

  const eventId =
    getRecordValue(record, 'eventId') ??
    getRecordValue(record, 'event_id') ??
    getRecordValue(record, 'id');

  if (!incidentId && !eventId) return null;

  return { incidentId, eventId };
}

function findIncidentInCache(payload: IncidentNotificationPayload): ParsedIncident | null {
  try {
    if (!payload.eventId && !payload.incidentId) {
      return null;
    }
    if (payload.eventId) {
      INC_NOTIFICATION_METRICS.cacheRequests += 1;
      const cacheStart = Date.now();
      const incident = findLatestIncidentInCache(payload, 'eventId');
      const cacheLookupMs = Date.now() - cacheStart;
      const hasResult = Boolean(incident);
      if (hasResult) {
        INC_NOTIFICATION_METRICS.cacheHits += 1;
      } else {
        INC_NOTIFICATION_METRICS.cacheMisses += 1;
      }
      trackLookupTiming('cache', cacheLookupMs, hasResult);
      if (incident) {
        return incident;
      }

      if (!payload.incidentId) {
        return null;
      }
    }

    INC_NOTIFICATION_METRICS.cacheRequests += 1;
    const cacheStart = Date.now();
    const incident = findLatestIncidentInCache(payload, 'incidentId');
    const cacheLookupMs = Date.now() - cacheStart;
    const hasResult = Boolean(incident);
    if (hasResult) {
      INC_NOTIFICATION_METRICS.cacheHits += 1;
    } else {
      INC_NOTIFICATION_METRICS.cacheMisses += 1;
    }
    trackLookupTiming('cache', cacheLookupMs, hasResult);
    return incident;
  } catch (error) {
    console.warn('[Notifications] Failed to read incident from cache:', error);
  }

  return null;
}

export async function fetchIncidentFromRelay(
  payload: IncidentNotificationPayload
): Promise<ParsedIncident | null> {
  if (!payload.incidentId && !payload.eventId) return null;

  const lookupStart = Date.now();
  INC_NOTIFICATION_METRICS.totalRequests += 1;
  const cached = findIncidentInCache(payload);
  if (cached) {
    INC_NOTIFICATION_METRICS.lastLookupMs = Date.now() - lookupStart;
    logNotificationPerf(`cache-hit source=${getLookupSourceLabel(payload.eventId ? 'eventId' : 'incidentId')}`);
    return cached;
  }

  const relayStart = Date.now();
  INC_NOTIFICATION_METRICS.relayRequests += 1;

  try {
    if (payload.eventId) {
      const filter: NDKFilter[] = [{ ids: [payload.eventId] }];
      const event = await ndk.fetchEvent(filter, INCIDENT_NOTIFICATION_RELAY_OPTIONS);
      const relayLookupMs = Date.now() - relayStart;
      const parsed = event ? parseIncidentEvent(event) : null;
      if (parsed) {
        INC_NOTIFICATION_METRICS.relayParses += 1;
      }
      trackLookupTiming('relay', relayLookupMs, Boolean(parsed));
      if (parsed) {
        return parsed;
      }
      if (!payload.incidentId) {
        INC_NOTIFICATION_METRICS.lastLookupMs = Date.now() - lookupStart;
        return null;
      }
    }

    if (payload.incidentId) {
      const filter: NDKFilter<number>[] = [
        {
          kinds: [NOSTR_KINDS.INCIDENT],
          '#d': [payload.incidentId],
        },
      ];
      const event = await ndk.fetchEvent(filter, INCIDENT_NOTIFICATION_RELAY_OPTIONS);
      const parsed = event ? parseIncidentEvent(event) : null;
      const relayLookupMs = Date.now() - relayStart;
      if (parsed) {
        INC_NOTIFICATION_METRICS.relayParses += 1;
      }
      trackLookupTiming('relay', relayLookupMs, Boolean(parsed));
      return parsed;
    }
  } catch (error) {
    console.warn('[Notifications] Failed to fetch incident event:', error);
  }

  logNotificationPerf(
    `cache-miss source=${getLookupSourceLabel(payload.eventId ? 'eventId' : 'incidentId')}`
  );
  INC_NOTIFICATION_METRICS.lastLookupMs = Date.now() - lookupStart;

  return null;
}
