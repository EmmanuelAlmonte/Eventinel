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

  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const fetchedProfilesRef = useRef<Set<string>>(new Set());
  const [didTimeout, setDidTimeout] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const comments = useMemo(() => {
    const map = new Map<string, IncidentComment>();

    for (const event of events) {
      if (event.kind !== NOSTR_KINDS.ALERT || !event.content) continue;

      const createdAt = event.created_at ?? Math.floor(Date.now() / 1000);
      const createdAtMs = createdAt * 1000;
      const profile = profiles[event.pubkey];

      map.set(event.id, {
        id: event.id,
        authorPubkey: event.pubkey,
        content: event.content,
        createdAt,
        createdAtMs,
        displayName: getDisplayName(event.pubkey, profile),
        avatarUrl: profile?.avatarUrl,
      });
    }

    return Array.from(map.values()).sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [events, profiles]);

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

    const authors = Array.from(new Set(comments.map((comment) => comment.authorPubkey)));
    const missing = authors.filter((pubkey) => !fetchedProfilesRef.current.has(pubkey));

    if (missing.length === 0) return;

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
  }, [comments, incident]);

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

  const retry = useCallback(() => {
    setRetryToken((value) => value + 1);
  }, []);

  return {
    comments,
    isLoading: !eose && events.length === 0 && !didTimeout,
    isStale: didTimeout && events.length === 0 && !eose,
    retry,
    postComment,
  };
}
