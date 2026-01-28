import type { NDKFilter } from '@nostr-dev-kit/mobile';
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

export async function fetchIncidentFromRelay(
  payload: IncidentNotificationPayload
): Promise<ParsedIncident | null> {
  if (!payload.incidentId && !payload.eventId) return null;

  const options = { cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY };

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
