import { useEffect, useRef, useState } from 'react';
import { NDKSubscriptionCacheUsage } from '@nostr-dev-kit/mobile';
import { ndk } from '@lib/ndk';
import { NOSTR_KINDS } from '@lib/nostr/config';
import type { ParsedIncident } from '@lib/nostr/events/types';

import { parseProfileMetadata } from './helpers';
import type { IncidentComment, ProfileSummary } from './types';

type UseCommentProfilesOptions = {
  incident?: ParsedIncident | null;
  visibleComments: IncidentComment[];
};

export function useCommentProfiles({
  incident,
  visibleComments,
}: UseCommentProfilesOptions): Record<string, ProfileSummary> {
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const fetchedProfilesRef = useRef<Set<string>>(new Set());

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
          setProfiles((previous) => ({ ...previous, ...nextProfiles }));
        }
      })
      .catch((error) => {
        console.warn('[Comments] Failed to fetch profiles:', error);
      });
  }, [incident, visibleComments]);

  return profiles;
}
