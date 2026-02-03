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

export function coerceIncidentNotificationPayload(
  data: unknown
): IncidentNotificationPayload | null {
  if (!data || typeof data !== 'object') return null;

  const record = data as NotificationData;

  const incidentId =
    typeof record.incidentId === 'string'
      ? record.incidentId
      : typeof record.incident_id === 'string'
        ? record.incident_id
        : undefined;

  const eventId =
    typeof record.eventId === 'string'
      ? record.eventId
      : typeof record.event_id === 'string'
        ? record.event_id
        : typeof record.id === 'string'
          ? record.id
          : undefined;

  if (!incidentId && !eventId) return null;

  return { incidentId, eventId };
}

function selectLatestEvent(events: NDKEvent[]): NDKEvent | null {
  if (events.length === 0) return null;
  return events.reduce((latest, current) => {
    if (!latest) return current;
    if ((current.created_at ?? 0) > (latest.created_at ?? 0)) {
      return current;
    }
    return latest;
  }, events[0]);
}

function findIncidentInCache(
  payload: IncidentNotificationPayload
): ParsedIncident | null {
  try {
    if (payload.eventId) {
      const cached = ndk.fetchEventSync([{ ids: [payload.eventId] }]);
      if (cached && cached.length > 0) {
        const event = selectLatestEvent(cached);
        return event ? parseIncidentEvent(event) : null;
      }
    }

    if (payload.incidentId) {
      const cached = ndk.fetchEventSync([
        { kinds: [NOSTR_KINDS.INCIDENT as number] },
      ]);
      if (cached && cached.length > 0) {
        for (const event of cached) {
          const parsed = parseIncidentEvent(event);
          if (parsed?.incidentId === payload.incidentId) {
            return parsed;
          }
        }
      }
    }
  } catch (error) {
    console.warn('[Notifications] Failed to read incident from cache:', error);
  }

  return null;
}

export async function fetchIncidentFromRelay(
  payload: IncidentNotificationPayload
): Promise<ParsedIncident | null> {
  if (!payload.incidentId && !payload.eventId) return null;

  const cached = findIncidentInCache(payload);
  if (cached) return cached;

  const options = { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST };

  try {
    if (payload.eventId) {
      const filter: NDKFilter[] = [{ ids: [payload.eventId] }];
      const event = await ndk.fetchEvent(filter, options);
      if (event) {
        return parseIncidentEvent(event);
      }
    }

    if (payload.incidentId) {
      const filter: NDKFilter<number>[] = [
        {
          kinds: [NOSTR_KINDS.INCIDENT],
          '#d': [payload.incidentId],
        },
      ];
      const event = await ndk.fetchEvent(filter, options);
      if (event) {
        return parseIncidentEvent(event);
      }
    }
  } catch (error) {
    console.warn('[Notifications] Failed to fetch incident event:', error);
  }

  return null;
}
