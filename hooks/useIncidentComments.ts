/**
 * useIncidentComments Hook
 *
 * Subscribes to Nostr comments (kind:1) for an incident and provides
 * a helper to publish new comments using NIP-10 threading tags.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NDKEvent, useSubscribe, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/mobile';
import type { NDKEvent as NDKEventType, NDKFilter } from '@nostr-dev-kit/mobile';

import { ndk } from '@lib/ndk';
import { NOSTR_KINDS } from '@lib/nostr/config';
import type { ParsedIncident } from '@lib/nostr/events/types';

export type IncidentComment = {
  id: string;
  authorPubkey: string;
  content: string;
  createdAt: number;
  createdAtMs: number;
  displayName: string;
  avatarUrl?: string;
  deletedOnRelays?: string[];
};

export type CommentDeletionNotice = {
  id: string;
  relays: string[];
  timestampMs: number;
};

type ProfileSummary = {
  displayName?: string;
  name?: string;
  avatarUrl?: string;
};

export type UseIncidentCommentsResult = {
  comments: IncidentComment[];
  isLoading: boolean;
  isStale: boolean;
  retry: () => void;
  postComment: (content: string, replyTo?: IncidentComment) => Promise<void>;
  deleteComment: (comment: IncidentComment) => Promise<void>;
  recentDeletions: CommentDeletionNotice[];
};

function buildIncidentAddress(incident: ParsedIncident): string {
  return `${NOSTR_KINDS.INCIDENT}:${incident.pubkey}:${incident.incidentId}`;
}

function parseProfileMetadata(event: NDKEventType): ProfileSummary | null {
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

function getRelayUrls(event: NDKEventType): string[] {
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

function getDeletedEventIds(event: NDKEventType): string[] {
  if (event.kind !== NOSTR_KINDS.EVENT_DELETION) return [];

  const ids = (event.tags || [])
    .filter((tag) => tag[0] === 'e' && typeof tag[1] === 'string')
    .map((tag) => tag[1]);

  return Array.from(new Set(ids));
}

const RECENT_DELETION_TTL_MS = 5 * 60 * 1000;
const MAX_RECENT_DELETIONS = 3;

export function useIncidentComments(
  incident?: ParsedIncident | null
): UseIncidentCommentsResult {
  const incidentAddress = useMemo(
    () => (incident ? buildIncidentAddress(incident) : null),
    [incident]
  );
  const [retryToken, setRetryToken] = useState(0);

  const filters = useMemo((): NDKFilter[] | false => {
    if (!incident || !incidentAddress) return false;

    return [
      { kinds: [NOSTR_KINDS.ALERT], '#a': [incidentAddress] },
      { kinds: [NOSTR_KINDS.ALERT], '#e': [incident.eventId] },
    ];
  }, [incident, incidentAddress, retryToken]);

  const { events, eose } = useSubscribe(filters, {
    closeOnEose: false,
    bufferMs: 200,
    cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    groupable: false,
  });

  const commentEventIds = useMemo(() => {
    const ids: string[] = [];
    for (const event of events) {
      if (event.kind === NOSTR_KINDS.ALERT && event.id) {
        ids.push(event.id);
      }
    }
    return ids;
  }, [events]);

  const deletionFilters = useMemo((): NDKFilter[] | false => {
    if (!incident || commentEventIds.length === 0) return false;

    return [
      {
        kinds: [NOSTR_KINDS.EVENT_DELETION],
        '#e': commentEventIds,
      },
    ];
  }, [commentEventIds, incident, retryToken]);

  const { events: deletionEvents } = useSubscribe(deletionFilters, {
    closeOnEose: false,
    bufferMs: 200,
    cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    groupable: false,
  });

  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const fetchedProfilesRef = useRef<Set<string>>(new Set());
  const [didTimeout, setDidTimeout] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deletedRelaysById, setDeletedRelaysById] = useState<Record<string, string[]>>({});
  const [recentDeletions, setRecentDeletions] = useState<CommentDeletionNotice[]>([]);

  const allComments = useMemo(() => {
    const map = new Map<string, IncidentComment>();

    for (const event of events) {
      if (event.kind !== NOSTR_KINDS.ALERT || !event.content) continue;

      const createdAt = event.created_at ?? Math.floor(Date.now() / 1000);
      const createdAtMs = createdAt * 1000;
      const profile = profiles[event.pubkey];
      const deletedOnRelays = deletedRelaysById[event.id];

      map.set(event.id, {
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

    return Array.from(map.values()).sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [events, profiles, deletedRelaysById]);

  const visibleComments = useMemo(
    () => allComments.filter((comment) => !deletedRelaysById[comment.id]),
    [allComments, deletedRelaysById]
  );

  useEffect(() => {
    setDeletedRelaysById({});
    setRecentDeletions([]);
  }, [incident?.eventId]);

  useEffect(() => {
    if (!deletionFilters || deletionEvents.length === 0) return;

    const commentIdSet = new Set(commentEventIds);
    const now = Date.now();
    const deletionUpdates = new Map<string, string[]>();

    setDeletedRelaysById((prev) => {
      let next: Record<string, string[]> | null = null;

      const ensureNext = () => {
        if (!next) {
          next = { ...prev };
        }
        return next;
      };

      for (const event of deletionEvents) {
        if (event.kind !== NOSTR_KINDS.EVENT_DELETION) continue;

        const targetIds = getDeletedEventIds(event).filter((id) => commentIdSet.has(id));
        if (targetIds.length === 0) continue;

        const relayUrls = getRelayUrls(event);
        const relayList = relayUrls.length > 0 ? relayUrls : ['unknown relay'];

        for (const targetId of targetIds) {
          const current = (next ?? prev)[targetId] ?? [];
          const relaySet = new Set(current);
          const sizeBefore = relaySet.size;
          relayList.forEach((url) => relaySet.add(url));

          if (relaySet.size !== sizeBefore) {
            const updated = ensureNext();
            updated[targetId] = Array.from(relaySet);
          }

          const merged = new Set(deletionUpdates.get(targetId) ?? []);
          relayList.forEach((url) => merged.add(url));
          deletionUpdates.set(targetId, Array.from(merged));
        }
      }

      return next ?? prev;
    });

    if (deletionUpdates.size > 0) {
      setRecentDeletions((prev) => {
        const cutoff = now - RECENT_DELETION_TTL_MS;
        const map = new Map<string, CommentDeletionNotice>();

        prev
          .filter((notice) => notice.timestampMs >= cutoff)
          .forEach((notice) => {
            map.set(notice.id, notice);
          });

        deletionUpdates.forEach((relays, id) => {
          const existing = map.get(id);
          const relaySet = new Set(existing?.relays ?? []);
          relays.forEach((url) => relaySet.add(url));

          map.set(id, {
            id,
            relays: Array.from(relaySet),
            timestampMs: now,
          });
        });

        return Array.from(map.values())
          .sort((a, b) => b.timestampMs - a.timestampMs)
          .slice(0, MAX_RECENT_DELETIONS);
      });
    }
  }, [commentEventIds, deletionEvents, deletionFilters]);

  useEffect(() => {
    if (commentEventIds.length === 0) {
      setDeletedRelaysById((prev) =>
        Object.keys(prev).length === 0 ? prev : {}
      );
      return;
    }

    setDeletedRelaysById((prev) => {
      const next: Record<string, string[]> = {};
      for (const id of commentEventIds) {
        if (prev[id]) {
          next[id] = prev[id];
        }
      }

      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [commentEventIds]);

  useEffect(() => {
    if (!filters) return undefined;

    setDidTimeout(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = setTimeout(() => {
      setDidTimeout(true);
    }, 3000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [filters]);

  useEffect(() => {
    if (!filters) return;

    if (events.length > 0 || eose) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [events.length, eose, filters]);

  useEffect(() => {
    if (!incident) return;

    const authors = Array.from(new Set(visibleComments.map((comment) => comment.authorPubkey)));
    const missing = authors.filter((pubkey) => !fetchedProfilesRef.current.has(pubkey));

    if (missing.length === 0) return;
    if (!ndk?.fetchEvents) return;

    missing.forEach((pubkey) => fetchedProfilesRef.current.add(pubkey));

    ndk
      .fetchEvents(
        {
          kinds: [NOSTR_KINDS.METADATA],
          authors: missing,
          limit: missing.length,
        },
        { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST, groupable: false }
      )
      .then((results) => {
        if (!results || results.size === 0) return;

        const nextProfiles: Record<string, ProfileSummary> = {};
        results.forEach((event) => {
          const parsed = parseProfileMetadata(event);
          if (parsed) {
            nextProfiles[event.pubkey] = parsed;
          }
        });

        if (Object.keys(nextProfiles).length > 0) {
          setProfiles((prev) => ({ ...prev, ...nextProfiles }));
        }
      })
      .catch((error) => {
        console.warn('[Comments] Failed to fetch profiles:', error);
      });
  }, [incident, visibleComments]);

  const postComment = useCallback(
    async (content: string, replyTo?: IncidentComment) => {
      if (!incident || !incidentAddress) {
        throw new Error('Incident is not available');
      }

      const trimmed = content.trim();
      if (!trimmed) return;

      const event = new NDKEvent(ndk);
      event.kind = NOSTR_KINDS.ALERT;
      event.content = trimmed;
      event.tags = [
        ['a', incidentAddress, '', 'root'],
        ['e', incident.eventId, '', 'root'],
        ['p', incident.pubkey],
      ];

      if (replyTo) {
        event.tags.push(['e', replyTo.id, '', 'reply']);
        event.tags.push(['p', replyTo.authorPubkey]);
      }

      await event.publish();
    },
    [incident, incidentAddress]
  );

  const deleteComment = useCallback(async (comment: IncidentComment) => {
    if (!comment?.id) {
      throw new Error('Comment is not available');
    }

    const deletion = new NDKEvent(ndk);
    deletion.kind = NOSTR_KINDS.EVENT_DELETION;
    deletion.content = 'Deleted by author';
    deletion.tags = [
      ['e', comment.id],
      ['k', String(NOSTR_KINDS.ALERT)],
    ];

    await deletion.publish();
  }, []);

  const retry = useCallback(() => {
    setRetryToken((value) => value + 1);
  }, []);

  return {
    comments: visibleComments,
    isLoading: !eose && events.length === 0 && !didTimeout,
    isStale: didTimeout && events.length === 0 && !eose,
    retry,
    postComment,
    deleteComment,
    recentDeletions,
  };
}
