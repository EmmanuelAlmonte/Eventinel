import { NOSTR_KINDS } from '@lib/nostr/config';
import type { ParsedIncident } from '@lib/nostr/events/types';

import type {
  CommentEvent,
  IncidentComment,
  ProfileSummary,
} from './types';

export const RECENT_DELETION_TTL_MS = 5 * 60 * 1000;
export const MAX_RECENT_DELETIONS = 3;

export function buildIncidentAddress(incident: ParsedIncident): string {
  return `${NOSTR_KINDS.INCIDENT}:${incident.pubkey}:${incident.incidentId}`;
}

export function parseProfileMetadata(event: CommentEvent): ProfileSummary | null {
  if (event.kind !== NOSTR_KINDS.METADATA) return null;

  try {
    const data = JSON.parse(event.content);
    if (!data || typeof data !== 'object') return null;

    const displayName =
      typeof data.displayName === 'string'
        ? data.displayName
        : typeof data.display_name === 'string'
          ? data.display_name
          : undefined;

    const name = typeof data.name === 'string' ? data.name : undefined;
    const avatarUrl =
      typeof data.picture === 'string'
        ? data.picture
        : typeof data.image === 'string'
          ? data.image
          : undefined;

    return { displayName, name, avatarUrl };
  } catch {
    return null;
  }
}

function getDisplayName(pubkey: string, profile?: ProfileSummary): string {
  return (
    profile?.displayName ||
    profile?.name ||
    `${pubkey.slice(0, 8)}…${pubkey.slice(-4)}`
  );
}

export function getRelayUrls(event: CommentEvent): string[] {
  const relays = event.onRelays?.length
    ? event.onRelays
    : event.relay
      ? [event.relay]
      : [];

  const urls = relays
    .map((relay) => relay.url)
    .filter((url): url is string => Boolean(url));

  return Array.from(new Set(urls));
}

export function getDeletedEventIds(event: CommentEvent): string[] {
  if (event.kind !== NOSTR_KINDS.EVENT_DELETION) return [];

  const ids = (event.tags || [])
    .filter((tag) => tag[0] === 'e' && typeof tag[1] === 'string')
    .map((tag) => tag[1]);

  return Array.from(new Set(ids));
}

export function buildCommentList(
  events: CommentEvent[],
  profiles: Record<string, ProfileSummary>,
  deletedRelaysById: Record<string, string[]>
): IncidentComment[] {
  const commentMap = new Map<string, IncidentComment>();

  for (const event of events) {
    if (event.kind !== NOSTR_KINDS.ALERT || !event.content) continue;

    const createdAt = event.created_at ?? Math.floor(Date.now() / 1000);
    const createdAtMs = createdAt * 1000;
    const profile = profiles[event.pubkey];
    const deletedOnRelays = deletedRelaysById[event.id];

    commentMap.set(event.id, {
      id: event.id,
      authorPubkey: event.pubkey,
      content: event.content,
      createdAt,
      createdAtMs,
      displayName: getDisplayName(event.pubkey, profile),
      avatarUrl: profile?.avatarUrl,
      deletedOnRelays:
        deletedOnRelays && deletedOnRelays.length > 0 ? deletedOnRelays : undefined,
    });
  }

  return Array.from(commentMap.values()).sort((a, b) => b.createdAtMs - a.createdAtMs);
}
