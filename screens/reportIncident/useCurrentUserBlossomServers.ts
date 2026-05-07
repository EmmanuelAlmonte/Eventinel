import { useEffect, useState } from 'react';
import {
  NDKSubscriptionCacheUsage,
  useNDK,
  useNDKCurrentPubkey,
} from '@nostr-dev-kit/mobile';

import {
  BLOSSOM_KIND_SERVER_LIST,
  normalizeKind10063ServerTags,
} from '@lib/media/blossomConfig';

type BlossomServerListEvent = {
  created_at?: number;
  tags?: unknown;
};

export function useCurrentUserBlossomServers(): string[] {
  const { ndk } = useNDK();
  const currentPubkey = useNDKCurrentPubkey();
  const fetchEvents = ndk?.fetchEvents;
  const [servers, setServers] = useState<string[]>([]);

  useEffect(() => {
    let isActive = true;

    if (!currentPubkey || !fetchEvents) {
      setServers((previous) => (previous.length === 0 ? previous : []));
      return () => {
        isActive = false;
      };
    }

    fetchEvents(
      {
        kinds: [BLOSSOM_KIND_SERVER_LIST],
        authors: [currentPubkey],
        limit: 1,
      },
      { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST, groupable: false }
    )
      .then((events: Set<BlossomServerListEvent> | BlossomServerListEvent[] | null | undefined) => {
        if (!isActive) return;
        const latest = pickLatestServerListEvent(events);
        const nextServers = normalizeKind10063ServerTags(latest?.tags ?? []);
        setServers((previous) => (areStringArraysEqual(previous, nextServers) ? previous : nextServers));
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        if (__DEV__) {
          console.warn('[Blossom] Failed to fetch kind:10063 server list:', error);
        }
        setServers((previous) => (previous.length === 0 ? previous : []));
      });

    return () => {
      isActive = false;
    };
  }, [currentPubkey, fetchEvents]);

  return servers;
}

function pickLatestServerListEvent(
  events: Set<BlossomServerListEvent> | BlossomServerListEvent[] | null | undefined
): BlossomServerListEvent | null {
  const eventList = Array.isArray(events) ? events : Array.from(events ?? []);
  let latest: BlossomServerListEvent | null = null;

  for (const event of eventList) {
    if (!latest || (event.created_at ?? 0) > (latest.created_at ?? 0)) {
      latest = event;
    }
  }

  return latest;
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}
