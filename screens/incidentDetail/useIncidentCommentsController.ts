import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { showToast } from '@components/ui';
import { useIncidentComments, type IncidentComment } from '@hooks';
import type { ProcessedIncident } from '@hooks/useIncidentSubscription';

type CurrentUser = {
  pubkey: string;
} | null;

function formatRelayList(relays: string[]): string {
  if (!relays || relays.length === 0) return '';
  const cleaned = relays
    .map((relay) => relay.replace(/^wss?:\/\//, ''))
    .filter((relay) => relay.length > 0);
  if (cleaned.length <= 2) {
    return cleaned.join(', ');
  }
  return `${cleaned.slice(0, 2).join(', ')} +${cleaned.length - 2} more`;
}

export function useIncidentCommentsController(
  incident: ProcessedIncident | undefined,
  currentUser: CurrentUser
) {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const lastDeletionNoticeRef = useRef<string | null>(null);
  const hasMountedRef = useRef(false);

  const {
    comments,
    isLoading: isLoadingComments,
    isStale: commentsAreStale,
    retry: retryComments,
    postComment,
    deleteComment,
    recentDeletions,
  } = useIncidentComments(incident);

  const handleCommentSubmit = useCallback(async () => {
    if (!commentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const trimmed = commentText.trim();
      await postComment(trimmed);
      setCommentText('');
    } catch (error) {
      console.warn('[Comments] Failed to publish comment:', error);
      showToast.error('Failed to post comment', 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  }, [commentText, isSubmitting, postComment]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const latest = recentDeletions[0];
    if (!latest || latest.id === lastDeletionNoticeRef.current) return;

    lastDeletionNoticeRef.current = latest.id;
    const relayLabel = formatRelayList(latest.relays);
    showToast.info('Comment deleted', relayLabel ? `Relays: ${relayLabel}` : undefined);
  }, [recentDeletions]);

  const confirmDeleteComment = useCallback(
    (comment: IncidentComment) => {
      if (!currentUser || currentUser.pubkey !== comment.authorPubkey) return;

      Alert.alert(
        'Delete comment?',
        'This will request deletion on your connected relays.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setDeletingCommentId(comment.id);
              try {
                await deleteComment(comment);
              } catch (error) {
                console.warn('[Comments] Failed to delete comment:', error);
                showToast.error('Failed to delete comment', 'Please try again');
              } finally {
                setDeletingCommentId((current) => (current === comment.id ? null : current));
              }
            },
          },
        ],
        { cancelable: true }
      );
    },
    [currentUser, deleteComment]
  );

  return {
    commentText,
    setCommentText,
    isSubmitting,
    comments,
    isLoadingComments,
    commentsAreStale,
    retryComments,
    recentDeletions,
    showAllComments,
    setShowAllComments,
    deletingCommentId,
    handleCommentSubmit,
    confirmDeleteComment,
  };
}
