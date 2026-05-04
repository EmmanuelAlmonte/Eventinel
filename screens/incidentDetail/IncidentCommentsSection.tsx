import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Icon, Text } from '@rneui/themed';

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
  const hasComments = comments.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.commentsHeader}>
        <Text style={[styles.commentsTitle, { color: colors.text }]}>Discussion</Text>
        <Text style={[styles.commentsSubtitle, { color: colors.textMuted }]}>
          {comments.length > 0
            ? `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'} so far.`
            : 'Comments and follow-up discussion live here.'}
        </Text>
      </View>

      {commentsAreStale && comments.length === 0 ? (
        <View style={[styles.commentsBanner, { backgroundColor: 'rgba(148, 163, 184, 0.12)' }]}>
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
        <View style={[styles.commentsBanner, { backgroundColor: 'rgba(148, 163, 184, 0.12)' }]}>
          <Icon name="delete-outline" type="material" size={16} color={colors.textMuted} />
          <Text style={[styles.commentsBannerText, { color: colors.textMuted }]}>
            {recentDeletions.length === 1 ? '1 comment deleted' : `${recentDeletions.length} comments deleted`}
            {recentDeletions[0]?.relays?.length
              ? ` on ${formatRelayList(recentDeletions[0].relays)}`
              : ''}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.commentsSurface,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {isLoadingComments && comments.length === 0 ? (
          <View style={styles.emptyComments}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.emptySubtext, { color: colors.textMuted, marginTop: 8 }]}>
              Loading discussion...
            </Text>
          </View>
        ) : !hasComments ? (
          <View style={styles.emptyComments}>
            <Text style={[styles.emptyText, { color: colors.text }]}>No comments yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              There is no discussion on this report yet.
            </Text>
          </View>
        ) : (
          <>
            {displayedComments.map((comment, index) => {
              const canDelete = currentUserPubkey === comment.authorPubkey;
              const isDeleting = deletingCommentId === comment.id;

              return (
                <View
                  key={comment.id}
                  style={[
                    styles.commentRow,
                    index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 },
                  ]}
                >
                  <Pressable
                    onLongPress={() => onDeleteComment(comment)}
                    disabled={!canDelete || isDeleting}
                  >
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
                          <Text style={[styles.commentAuthor, { color: colors.text }]}>
                            {comment.displayName}
                          </Text>
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
                                  <Icon
                                    name="more-vert"
                                    type="material"
                                    size={18}
                                    color={colors.textMuted}
                                  />
                                )}
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                        {comment.content ? (
                          <Text style={[styles.commentText, { color: colors.text }]}>
                            {comment.content}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  commentsHeader: {
    marginBottom: 14,
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  commentsSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentsSurface: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  commentRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
