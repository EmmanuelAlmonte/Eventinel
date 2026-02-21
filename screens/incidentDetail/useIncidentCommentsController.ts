import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import Constants from 'expo-constants';

import { showToast } from '@components/ui';
import { useIncidentComments, type IncidentComment } from '@hooks';
import type { ProcessedIncident } from '@hooks/useIncidentSubscription';
import { pickMediaFromLibrary } from '@lib/media/pickMedia';
import { uploadToNip96 } from '@lib/media/nip96';

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

function resolveNip96Endpoint(): string {
  const extra = (Constants?.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return (
    process.env.EXPO_PUBLIC_EVENTINEL_NIP96_ENDPOINT ||
    process.env.EVENTINEL_NIP96_ENDPOINT ||
    (typeof extra.EVENTINEL_NIP96_ENDPOINT === 'string' ? extra.EVENTINEL_NIP96_ENDPOINT : '') ||
    (typeof extra.EVENTINEL_NIP96_UPLOAD_URL === 'string' ? extra.EVENTINEL_NIP96_UPLOAD_URL : '') ||
    process.env.EVENTINEL_NIP96_UPLOAD_URL ||
    ''
  );
}

export function useIncidentCommentsController(
  incident: ProcessedIncident | undefined,
  currentUser: CurrentUser
) {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
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
    if (!commentText.trim() || isSubmitting || isUploadingMedia) return;
    setIsSubmitting(true);
    try {
      await postComment(commentText.trim());
      setCommentText('');
    } catch (error) {
      console.warn('[Comments] Failed to publish comment:', error);
      showToast.error('Failed to post comment', 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  }, [commentText, isSubmitting, isUploadingMedia, postComment]);

  const handleAddMedia = useCallback(async () => {
    const endpoint = resolveNip96Endpoint();
    if (!endpoint) {
      showToast.error(
        'Upload server not configured',
        'Set EVENTINEL_NIP96_ENDPOINT in .env.local (dev) or .env (prod)'
      );
      return;
    }
    if (isUploadingMedia) return;

    setIsUploadingMedia(true);
    try {
      const picked = await pickMediaFromLibrary();
      if (!picked) return;

      const fileName = picked.fileName || `eventinel-${Date.now()}`;
      const mimeType = picked.mimeType || (picked.type === 'video' ? 'video/mp4' : 'image/jpeg');
      const response = await uploadToNip96({
        endpoint,
        fileUri: picked.uri,
        fileName,
        mimeType,
      });

      setCommentText((previous) => (previous.trim() ? `${previous.trim()}\n${response.url}` : response.url));
      showToast.success('Uploaded', 'Link added to your comment');
    } catch (error) {
      console.warn('[Media] Upload failed:', error);
      showToast.error('Upload failed', error instanceof Error ? error.message : 'Please try again');
    } finally {
      setIsUploadingMedia(false);
    }
  }, [isUploadingMedia]);

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
    isUploadingMedia,
    comments,
    isLoadingComments,
    commentsAreStale,
    retryComments,
    recentDeletions,
    showAllComments,
    setShowAllComments,
    deletingCommentId,
    handleCommentSubmit,
    handleAddMedia,
    confirmDeleteComment,
  };
}
