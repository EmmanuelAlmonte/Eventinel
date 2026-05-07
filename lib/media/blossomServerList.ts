import { NDKSubscriptionCacheUsage } from '@nostr-dev-kit/mobile';

import {
  BLOSSOM_KIND_SERVER_LIST,
  normalizeKind10063ServerTags,
} from './blossomConfig';

type BlossomServerListEvent = {
  kind?: number;
  pubkey?: string;
  created_at?: number;
  tags?: unknown;
};

type BlossomServerListNdk = {
  fetchEventSync?: (...args: any[]) => unknown;
  fetchEvents?: (...args: any[]) => Promise<unknown>;
};

const AUTHOR_BLOSSOM_SERVER_LIST_OPTIONS = {
  cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
  groupable: false,
};

export function resolveBlossomServerListEvents(
  events: unknown,
  authorPubkey: string
): string[] {
  const latest = pickLatestServerListEvent(events, authorPubkey);
  return normalizeKind10063ServerTags(latest?.tags ?? []);
}

export function resolveCachedAuthorBlossomServerUrls(
  ndk: BlossomServerListNdk,
  authorPubkey: string | null | undefined
): string[] {
  if (!authorPubkey || typeof ndk.fetchEventSync !== 'function') {
    return [];
  }

  try {
    return resolveBlossomServerListEvents(
      ndk.fetchEventSync([
        {
          kinds: [BLOSSOM_KIND_SERVER_LIST],
          authors: [authorPubkey],
          limit: 1,
        },
      ]),
      authorPubkey
    );
  } catch (error) {
    if (__DEV__) {
      console.warn('[Blossom] Failed to read cached author server list:', error);
    }
    return [];
  }
}

export async function fetchAuthorBlossomServerUrls(
  ndk: BlossomServerListNdk,
  authorPubkey: string | null | undefined
): Promise<string[]> {
  if (!authorPubkey || typeof ndk.fetchEvents !== 'function') {
    return [];
  }

  try {
    const events = await ndk.fetchEvents(
      {
        kinds: [BLOSSOM_KIND_SERVER_LIST],
        authors: [authorPubkey],
        limit: 1,
      },
      AUTHOR_BLOSSOM_SERVER_LIST_OPTIONS
    );
    return resolveBlossomServerListEvents(events, authorPubkey);
  } catch (error) {
    if (__DEV__) {
      console.warn('[Blossom] Failed to fetch author server list:', error);
    }
    return [];
  }
}

function pickLatestServerListEvent(
  events: unknown,
  authorPubkey: string
): BlossomServerListEvent | null {
  let latest: BlossomServerListEvent | null = null;

  for (const event of toServerListEventArray(events)) {
    if (event.kind != null && event.kind !== BLOSSOM_KIND_SERVER_LIST) {
      continue;
    }
    if (event.pubkey != null && event.pubkey !== authorPubkey) {
      continue;
    }
    if (!latest || (event.created_at ?? 0) > (latest.created_at ?? 0)) {
      latest = event;
    }
  }

  return latest;
}

function toServerListEventArray(events: unknown): BlossomServerListEvent[] {
  if (!events) {
    return [];
  }
  if (events instanceof Set) {
    return Array.from(events).filter(isServerListEvent);
  }
  if (Array.isArray(events)) {
    return events.filter(isServerListEvent);
  }
  return isServerListEvent(events) ? [events] : [];
}

function isServerListEvent(value: unknown): value is BlossomServerListEvent {
  return Boolean(value && typeof value === 'object' && 'tags' in value);
}
