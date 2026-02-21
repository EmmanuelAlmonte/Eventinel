import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Card, Icon, Text } from '@rneui/themed';

import { formatRelativeTimeMs } from '@lib/utils/time';
import type { IncidentComment } from '@hooks';

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

type ThemeColors = {
  border: string;
  primary: string;
  surface: string;
  text: string;
  textMuted: string;
};

type RecentDeletion = {
  id: string;
  relays: string[];
  timestampMs: number;
};

type IncidentCommentsSectionProps = {
  colors: ThemeColors;
  comments: IncidentComment[];
  isLoadingComments: boolean;
  commentsAreStale: boolean;
  retryComments: () => void;
  recentDeletions: RecentDeletion[];
  showAllComments: boolean;
  onShowAllComments: () => void;
  currentUserPubkey?: string;
  deletingCommentId: string | null;
  onDeleteComment: (comment: IncidentComment) => void;
};

export function IncidentCommentsSection({
  colors,
  comments,
  isLoadingComments,
  commentsAreStale,
  retryComments,
  recentDeletions,
  showAllComments,
  onShowAllComments,
  currentUserPubkey,
  deletingCommentId,
  onDeleteComment,
}: IncidentCommentsSectionProps) {
  const displayedComments = showAllComments ? comments : comments.slice(0, 2);

  return (
    <View style={styles.section}>
      <View style={styles.commentsHeader}>
        <Icon name="chat-bubble-outline" type="material" size={20} color={colors.textMuted} />
        <Text style={[styles.commentsTitle, { color: colors.text }]}>Comments ({comments.length})</Text>
      </View>

      {commentsAreStale && comments.length === 0 ? (
        <View style={styles.commentsBanner}>
          <Icon name="info-outline" type="material" size={16} color={colors.textMuted} />
          <Text style={[styles.commentsBannerText, { color: colors.textMuted }]}>
            Relays slow, showing cached comments
          </Text>
          <Pressable onPress={retryComments} style={styles.commentsRetryButton}>
            <Text style={[styles.commentsRetryText, { color: colors.primary }]}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {recentDeletions.length > 0 ? (
        <View style={styles.commentsBanner}>
          <Icon name="delete-outline" type="material" size={16} color={colors.textMuted} />
          <Text style={[styles.commentsBannerText, { color: colors.textMuted }]}>
            {recentDeletions.length === 1 ? '1 comment deleted' : `${recentDeletions.length} comments deleted`}
            {recentDeletions[0]?.relays?.length
              ? ` on ${formatRelayList(recentDeletions[0].relays)}`
              : ''}
          </Text>
        </View>
      ) : null}

      {isLoadingComments && comments.length === 0 ? (
        <View style={styles.emptyComments}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.emptySubtext, { color: colors.textMuted, marginTop: 8 }]}>
            Loading comments...
          </Text>
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.emptyComments}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No comments yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Be the first to share what you know
          </Text>
        </View>
      ) : (
        <>
          {displayedComments.map((comment) => {
            const canDelete = currentUserPubkey === comment.authorPubkey;
            const isDeleting = deletingCommentId === comment.id;

            return (
              <Card
                key={comment.id}
                containerStyle={[
                  styles.commentCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Pressable onLongPress={() => onDeleteComment(comment)} disabled={!canDelete || isDeleting}>
                  <View style={styles.comment}>
                    <Avatar
                      rounded
                      size={36}
                      title={comment.displayName.charAt(0)}
                      source={comment.avatarUrl ? { uri: comment.avatarUrl } : undefined}
                      containerStyle={[styles.commentAvatar, { backgroundColor: colors.primary }]}
                    />
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={[styles.commentAuthor, { color: colors.text }]}>{comment.displayName}</Text>
                        <View style={styles.commentMetaRow}>
                          <Text style={[styles.commentTime, { color: colors.textMuted }]}>
                            {formatRelativeTimeMs(comment.createdAtMs)}
                          </Text>
                          {canDelete ? (
                            <Pressable
                              onPress={() => onDeleteComment(comment)}
                              style={styles.commentMenuButton}
                              hitSlop={8}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <ActivityIndicator size="small" color={colors.textMuted} />
                              ) : (
                                <Icon name="more-vert" type="material" size={18} color={colors.textMuted} />
                              )}
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                      <Text style={[styles.commentText, { color: colors.text }]}>{comment.content}</Text>
                    </View>
                  </View>
                </Pressable>
              </Card>
            );
          })}

          {comments.length > 2 && !showAllComments ? (
            <Pressable onPress={onShowAllComments} style={styles.showMoreButton}>
              <Text style={[styles.showMoreText, { color: colors.primary }]}>
                Show {comments.length - 2} more comments
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
  },
  commentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    margin: 0,
    marginBottom: 8,
  },
  comment: {
    flexDirection: 'row',
    gap: 12,
  },
  commentAvatar: {
    marginTop: 2,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentMenuButton: {
    padding: 2,
  },
  commentsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  commentsBannerText: {
    flex: 1,
    fontSize: 12,
  },
  commentsRetryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  commentsRetryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  showMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
