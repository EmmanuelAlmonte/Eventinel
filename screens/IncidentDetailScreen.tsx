/**
 * IncidentDetailScreen
 *
 * Full-screen incident detail page with mini-map, description,
 * and community comments. Follows the MVP design specification.
 *
 * Design patterns adapted from incident-tracker mockup:
 * - Glass card effects with semi-transparent backgrounds
 * - Gradient icon containers with shadows
 * - Fixed bottom action bar
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  Platform,
  Share,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Text as RNText,
} from 'react-native';
import { Text, Card, Icon, Button, Avatar, Divider } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { useNDKCurrentUser } from '@nostr-dev-kit/mobile';

import type { ParsedIncident } from '@lib/nostr/events/types';
import { TYPE_CONFIG, SEVERITY_COLORS, type IncidentType } from '@lib/nostr/config';
import { formatRelativeTime, formatRelativeTimeMs } from '@lib/utils/time';
import { useAppTheme, useIncidentComments, type IncidentComment } from '@hooks';
import { useIncidentCache } from '@contexts';
import { MAP_STYLES } from '@lib/map/types';
import { showToast } from '@components/ui';

// Route params type - now uses incidentId only (no serialization warning)
type DetailRouteParams = {
  IncidentDetail: {
    incidentId: string;
  };
};

const MAX_RELAY_LABELS = 2;

function formatRelayList(relays: string[]): string {
  if (!relays || relays.length === 0) return '';
  const cleaned = relays
    .map((relay) => relay.replace(/^wss?:\/\//, ''))
    .filter((relay) => relay.length > 0);

  if (cleaned.length <= MAX_RELAY_LABELS) {
    return cleaned.join(', ');
  }

  return `${cleaned.slice(0, MAX_RELAY_LABELS).join(', ')} +${cleaned.length - MAX_RELAY_LABELS} more`;
}

export default function IncidentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<DetailRouteParams, 'IncidentDetail'>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const currentUser = useNDKCurrentUser();
  const { getIncident, version } = useIncidentCache();

  // Get incident from cache using incidentId
  // Re-lookup when version changes (cache updated after mount)
  const incidentId = route.params?.incidentId;
  const incident = incidentId ? getIncident(incidentId) : undefined;

  // Cache miss timeout - show loading briefly, then error
  const [showNotFound, setShowNotFound] = useState(false);

  // Delay map render until container has valid dimensions (fixes iOS 64x64 fallback)
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    if (incidentId && !incident) {
      console.log('[IncidentDetail] Cache miss for:', incidentId, 'version:', version);
      // Wait 2s for cache to populate before showing error
      const timer = setTimeout(() => setShowNotFound(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowNotFound(false);
    }
  }, [incidentId, incident, version]);

  // Comment composer state
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Nostr-native comments for this incident
  const {
    comments,
    isLoading: isLoadingComments,
    isStale: commentsAreStale,
    retry: retryComments,
    postComment,
    deleteComment,
    recentDeletions,
  } = useIncidentComments(incident);
  const [showAllComments, setShowAllComments] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const lastDeletionNoticeRef = useRef<string | null>(null);
  const hasMountedRef = useRef(false);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!incident) return;
    try {
      await Share.share({
        message: `"${incident.title}" at ${incident.location.address} — via Eventinel`,
        title: incident.title,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [incident]);

  // Handle directions
  const handleDirections = useCallback(() => {
    if (!incident) return;
    const { lat, lng } = incident.location;
    const url = Platform.select({
      ios: `maps://?daddr=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(incident.title)})`,
    });
    if (url) {
      Linking.openURL(url).catch((err) => console.error('Could not open maps:', err));
    }
  }, [incident]);

  // Handle comment submit
  const handleCommentSubmit = useCallback(async () => {
    if (!commentText.trim() || isSubmitting) return;
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
    showToast.info(
      'Comment deleted',
      relayLabel ? `Relays: ${relayLabel}` : undefined
    );
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

  // Loading/error state if no incident
  if (!incident) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-left" type="material" size={28} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.errorContainer}>
          {showNotFound ? (
            <>
              <Icon name="error-outline" type="material" size={64} color={colors.error} />
              <Text style={[styles.errorTitle, { color: colors.text }]}>Incident not available</Text>
              <Text style={[styles.errorSubtitle, { color: colors.textMuted }]}>
                Return to map or feed to find incidents
              </Text>
              <Button title="Go Back" onPress={() => navigation.goBack()} />
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.errorTitle, { color: colors.text }]}>Loading incident...</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const typeConfig = TYPE_CONFIG[incident.type] || TYPE_CONFIG.other;
  const severityColor = SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS[1];
  const displayedComments = showAllComments ? comments : comments.slice(0, 2);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" type="material" size={28} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
        </Pressable>

        <View style={styles.headerRight}>
          {/* Live indicator */}
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveText, { color: colors.textMuted }]}>LIVE</Text>
          </View>

          {/* Share button */}
          <Pressable onPress={handleShare} style={styles.shareButton}>
            <Icon name="share" type="material" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mini Map - onLayout delays render until container has valid size (iOS fix) */}
        <View
          style={styles.mapContainer}
          onLayout={(e) => {
            if (e.nativeEvent.layout.width > 0 && !mapReady) {
              setMapReady(true);
            }
          }}
        >
          {mapReady ? (
            <Mapbox.MapView
              style={styles.miniMap}
              styleURL={MAP_STYLES.DARK}
              scrollEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              zoomEnabled={false}
            >
              <Mapbox.Camera
                zoomLevel={15}
                centerCoordinate={[incident.location.lng, incident.location.lat]}
                animationDuration={0}
              />
              <Mapbox.MarkerView
                coordinate={[incident.location.lng, incident.location.lat]}
              >
                <View style={[styles.mapMarker, { backgroundColor: typeConfig.color }]}>
                  <RNText style={styles.mapMarkerGlyph}>{typeConfig.glyph}</RNText>
                </View>
              </Mapbox.MarkerView>
            </Mapbox.MapView>
          ) : (
            <View style={[styles.miniMap, styles.mapPlaceholder]}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          )}
        </View>

        {/* Incident Header Card */}
        <View style={styles.section}>
          <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.incidentHeader}>
              {/* Gradient Icon */}
              <LinearGradient
                colors={typeConfig.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Icon name={typeConfig.icon} type="material" size={32} color="#FFFFFF" />
              </LinearGradient>

              {/* Info */}
              <View style={styles.incidentInfo}>
                <View style={styles.badgeRow}>
                  <Text style={[styles.typeBadge, { color: typeConfig.color }]}>
                    {incident.type.replace('_', ' ').toUpperCase()}
                  </Text>
                  {incident.isVerified && (
                    <View style={[styles.verifiedBadge, { backgroundColor: `${colors.success}20` }]}>
                      <Icon name="verified" type="material" size={12} color={colors.success} />
                      <Text style={[styles.verifiedText, { color: colors.success }]}>VERIFIED</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.incidentTitle, { color: colors.text }]}>{incident.title}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Icon name="schedule" type="material" size={14} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {formatRelativeTime(incident.occurredAt)}
                    </Text>
                  </View>
                  <View style={[styles.severityPill, { backgroundColor: severityColor }]}>
                    <Text style={styles.severityText}>Severity {incident.severity}</Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Location Card */}
        <View style={styles.section}>
          <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.locationRow}>
              <View style={[styles.locationIcon, { backgroundColor: `${typeConfig.color}20` }]}>
                <Icon name="location-on" type="material" size={20} color={typeConfig.color} />
              </View>
              <View style={styles.locationContent}>
                <Text style={[styles.locationLabel, { color: colors.textMuted }]}>Location</Text>
                <Text style={[styles.locationAddress, { color: colors.text }]}>{incident.location.address}</Text>
                {incident.location.city && (
                  <Text style={[styles.locationCity, { color: colors.textMuted }]}>
                    {incident.location.city}{incident.location.state ? `, ${incident.location.state}` : ''}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        </View>

        {/* Description Card */}
        <View style={styles.section}>
          <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Icon name="info-outline" type="material" size={18} color={colors.warning} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Incident Details</Text>
            </View>
            <Text style={[styles.description, { color: colors.text }]}>{incident.description}</Text>
          </Card>
        </View>

        {/* Source */}
        <View style={styles.sourceRow}>
          <View style={[styles.sourceDot, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.sourceText, { color: colors.textMuted }]}>Source: {incident.source}</Text>
        </View>

        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Comments Section */}
        <View style={styles.section}>
          <View style={styles.commentsHeader}>
            <Icon name="chat-bubble-outline" type="material" size={20} color={colors.textMuted} />
            <Text style={[styles.commentsTitle, { color: colors.text }]}>
              Comments ({comments.length})
            </Text>
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
              {displayedComments.map((comment) => (
                <Card
                  key={comment.id}
                  containerStyle={[styles.commentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Pressable
                    onLongPress={() => confirmDeleteComment(comment)}
                    disabled={
                      !currentUser ||
                      currentUser.pubkey !== comment.authorPubkey ||
                      deletingCommentId === comment.id
                    }
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
                          <Text style={[styles.commentAuthor, { color: colors.text }]}>{comment.displayName}</Text>
                          <View style={styles.commentMetaRow}>
                            <Text style={[styles.commentTime, { color: colors.textMuted }]}>
                              {formatRelativeTimeMs(comment.createdAtMs)}
                            </Text>
                            {currentUser && currentUser.pubkey === comment.authorPubkey ? (
                              <Pressable
                                onPress={() => confirmDeleteComment(comment)}
                                style={styles.commentMenuButton}
                                hitSlop={8}
                                disabled={deletingCommentId === comment.id}
                              >
                                {deletingCommentId === comment.id ? (
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
              ))}

              {comments.length > 2 && !showAllComments && (
                <Pressable onPress={() => setShowAllComments(true)} style={styles.showMoreButton}>
                  <Text style={[styles.showMoreText, { color: colors.primary }]}>
                    Show {comments.length - 2} more comments
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {currentUser ? (
          <View style={styles.composerRow}>
            <TextInput
              style={[styles.composerInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              maxLength={500}
              multiline
            />
            <Pressable
              onPress={handleCommentSubmit}
              disabled={!commentText.trim() || isSubmitting}
              style={[
                styles.sendButton,
                { backgroundColor: commentText.trim() ? colors.primary : colors.surface },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="send" type="material" size={20} color={commentText.trim() ? '#FFFFFF' : colors.textMuted} />
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.actionButtons}>
            <Button
              title="Share"
              onPress={handleShare}
              buttonStyle={[styles.actionButton, { backgroundColor: colors.surface }]}
              titleStyle={[styles.actionButtonText, { color: colors.text }]}
              icon={<Icon name="share" type="material" size={20} color={colors.text} style={{ marginRight: 8 }} />}
            />
            <Pressable onPress={handleDirections} style={{ flex: 1 }}>
              <LinearGradient
                colors={typeConfig.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.directionsButton}
              >
                <Icon name="navigation" type="material" size={20} color="#FFFFFF" />
                <Text style={styles.directionsButtonText}>Get Directions</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  shareButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Mini Map
  mapContainer: {
    height: 180,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  miniMap: {
    flex: 1,
  },
  mapPlaceholder: {
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0F172A',
  },
  mapMarkerGlyph: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Cards
  section: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    margin: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Incident Header
  incidentHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  incidentTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationCity: {
    fontSize: 14,
  },

  // Description
  description: {
    fontSize: 15,
    lineHeight: 22,
  },

  // Source
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sourceDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  sourceText: {
    fontSize: 11,
  },
  divider: {
    marginHorizontal: 16,
    marginBottom: 16,
  },

  // Comments
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

  // Action Bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  directionsButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
