import { useEffect, useState } from 'react';
import type { NDKFilter } from '@nostr-dev-kit/mobile';
import { NOSTR_KINDS } from '@lib/nostr/config';

import {
  getDeletedEventIds,
  getRelayUrls,
  MAX_RECENT_DELETIONS,
  RECENT_DELETION_TTL_MS,
} from './helpers';
import type { CommentDeletionNotice, CommentEvent } from './types';

type UseCommentDeletionsOptions = {
  incidentEventId?: string;
  commentEventIds: string[];
  deletionFilters: NDKFilter[] | false;
  deletionEvents: CommentEvent[];
};

export function useCommentDeletions({
  incidentEventId,
  commentEventIds,
  deletionFilters,
  deletionEvents,
}: UseCommentDeletionsOptions): {
  deletedRelaysById: Record<string, string[]>;
  recentDeletions: CommentDeletionNotice[];
} {
  const [deletedRelaysById, setDeletedRelaysById] = useState<Record<string, string[]>>({});
  const [recentDeletions, setRecentDeletions] = useState<CommentDeletionNotice[]>([]);

  useEffect(() => {
    setDeletedRelaysById({});
    setRecentDeletions([]);
  }, [incidentEventId]);

  useEffect(() => {
    if (!deletionFilters || deletionEvents.length === 0) return;

    const commentIdSet = new Set(commentEventIds);
    const now = Date.now();
    const deletionUpdates = new Map<string, string[]>();

    setDeletedRelaysById((previous) => {
      let next: Record<string, string[]> | null = null;
      const ensureNext = () => {
        if (!next) next = { ...previous };
        return next;
      };

      for (const event of deletionEvents) {
        if (event.kind !== NOSTR_KINDS.EVENT_DELETION) continue;

        const targetIds = getDeletedEventIds(event).filter((id) => commentIdSet.has(id));
        if (targetIds.length === 0) continue;

        const relayUrls = getRelayUrls(event);
        const relayList = relayUrls.length > 0 ? relayUrls : ['unknown relay'];

        for (const targetId of targetIds) {
          const current = (next ?? previous)[targetId] ?? [];
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

      return next ?? previous;
    });

    if (deletionUpdates.size === 0) return;

    setRecentDeletions((previous) => {
      const cutoff = now - RECENT_DELETION_TTL_MS;
      const recentMap = new Map<string, CommentDeletionNotice>();

      previous
        .filter((notice) => notice.timestampMs >= cutoff)
        .forEach((notice) => recentMap.set(notice.id, notice));

      deletionUpdates.forEach((relays, id) => {
        const existing = recentMap.get(id);
        const relaySet = new Set(existing?.relays ?? []);
        relays.forEach((url) => relaySet.add(url));
        recentMap.set(id, { id, relays: Array.from(relaySet), timestampMs: now });
      });

      return Array.from(recentMap.values())
        .sort((a, b) => b.timestampMs - a.timestampMs)
        .slice(0, MAX_RECENT_DELETIONS);
    });
  }, [commentEventIds, deletionEvents, deletionFilters]);

  useEffect(() => {
    if (commentEventIds.length === 0) {
      setDeletedRelaysById((previous) =>
        Object.keys(previous).length === 0 ? previous : {}
      );
      return;
    }

    setDeletedRelaysById((previous) => {
      const next: Record<string, string[]> = {};
      for (const id of commentEventIds) {
        if (previous[id]) {
          next[id] = previous[id];
        }
      }

      return Object.keys(next).length === Object.keys(previous).length ? previous : next;
    });
  }, [commentEventIds]);

  return { deletedRelaysById, recentDeletions };
}
