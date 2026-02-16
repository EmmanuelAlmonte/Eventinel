/**
 * useIncidentComments Hook
 *
 * Subscribes to incident comments (kind:1) and deletion events (kind:5),
 * resolves profile metadata, and exposes publish/delete helpers.
 */

import { useCallback, useMemo, useState } from 'react';
import { useSubscribe, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/mobile';
import type { NDKFilter } from '@nostr-dev-kit/mobile';

import { NOSTR_KINDS } from '@lib/nostr/config';
import type { ParsedIncident } from '@lib/nostr/events/types';

import { buildCommentList, buildIncidentAddress } from './incidentComments/helpers';
import { useCommentDeletions } from './incidentComments/useCommentDeletions';
import { useCommentProfiles } from './incidentComments/useCommentProfiles';
import { useCommentTimeout } from './incidentComments/useCommentTimeout';
import { useCommentActions } from './incidentComments/useCommentActions';
import type {
  CommentDeletionNotice,
  IncidentComment,
  UseIncidentCommentsResult,
} from './incidentComments/types';

export type {
  CommentDeletionNotice,
  IncidentComment,
  UseIncidentCommentsResult,
} from './incidentComments/types';

function useCommentFilters(
  incident?: ParsedIncident | null,
  incidentAddress?: string | null
): {
  filters: NDKFilter[] | false;
  commentEventIds: string[];
  deletionFilters: NDKFilter[] | false;
  events: any[];
  deletionEvents: any[];
  eose: boolean;
} {
  const filters = useMemo((): NDKFilter[] | false => {
    if (!incident || !incidentAddress) return false;

    return [
      { kinds: [NOSTR_KINDS.ALERT], '#a': [incidentAddress] },
      { kinds: [NOSTR_KINDS.ALERT], '#e': [incident.eventId] },
    ];
  }, [incident, incidentAddress]);

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
    return [{ kinds: [NOSTR_KINDS.EVENT_DELETION], '#e': commentEventIds }];
  }, [commentEventIds, incident]);

  const { events: deletionEvents } = useSubscribe(deletionFilters, {
    closeOnEose: false,
    bufferMs: 200,
    cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
    groupable: false,
  });

  return { filters, commentEventIds, deletionFilters, events, deletionEvents, eose };
}

export function useIncidentComments(
  incident?: ParsedIncident | null
): UseIncidentCommentsResult {
  const [retryToken, setRetryToken] = useState(0);
  const incidentAddress = useMemo(
    () => (incident ? buildIncidentAddress(incident) : null),
    [incident, retryToken]
  );

  const {
    filters,
    commentEventIds,
    deletionFilters,
    events,
    deletionEvents,
    eose,
  } = useCommentFilters(incident, incidentAddress);

  const { deletedRelaysById, recentDeletions } = useCommentDeletions({
    incidentEventId: incident?.eventId,
    commentEventIds,
    deletionFilters,
    deletionEvents,
  });

  const commentsForProfiles = useMemo(
    () => buildCommentList(events, {}, deletedRelaysById),
    [events, deletedRelaysById]
  );
  const visibleComments = useMemo(
    () => commentsForProfiles.filter((comment) => !deletedRelaysById[comment.id]),
    [commentsForProfiles, deletedRelaysById]
  );

  const profiles = useCommentProfiles({ incident, visibleComments });
  const comments = useMemo(
    () =>
      buildCommentList(events, profiles, deletedRelaysById).filter(
        (comment) => !deletedRelaysById[comment.id]
      ),
    [events, profiles, deletedRelaysById]
  );

  const didTimeout = useCommentTimeout({
    filters,
    eventsLength: events.length,
    eose,
  });

  const { postComment, deleteComment } = useCommentActions({
    incident,
    incidentAddress,
  });

  const retry = useCallback(() => {
    setRetryToken((value) => value + 1);
  }, []);

  return {
    comments,
    isLoading: !eose && events.length === 0 && !didTimeout,
    isStale: didTimeout && events.length === 0 && !eose,
    retry,
    postComment,
    deleteComment,
    recentDeletions,
  };
}
