import { useCallback } from 'react';
import { NDKEvent } from '@nostr-dev-kit/mobile';

import { ndk } from '@lib/ndk';
import { NOSTR_KINDS } from '@lib/nostr/config';
import type { ParsedIncident } from '@lib/nostr/events/types';

import type { IncidentComment } from './types';

type UseCommentActionsOptions = {
  incident?: ParsedIncident | null;
  incidentAddress: string | null;
};

export function useCommentActions({
  incident,
  incidentAddress,
}: UseCommentActionsOptions): {
  postComment: (content: string, replyTo?: IncidentComment) => Promise<void>;
  deleteComment: (comment: IncidentComment) => Promise<void>;
} {
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

  return { postComment, deleteComment };
}
