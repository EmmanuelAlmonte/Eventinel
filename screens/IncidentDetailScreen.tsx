/**
 * IncidentDetailScreen
 *
 * Full-screen incident detail page with mini-map, description,
 * and community comments. Follows the MVP design specification.
 *
 * Design patterns adapted from incident-tracker mockup:
 * - Glass card effects with semi-transparent backgrounds
 * - Gradient icon containers with shadows
 * - Pulse animations for live indicators
 * - Fixed bottom action bar
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Linking,
  Platform,
  Animated,
  Share,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Text, Card, Icon, Button, Avatar, Divider } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { useNDKCurrentUser } from '@nostr-dev-kit/mobile';

import type { ParsedIncident } from '../lib/nostr/events/types';
import { useAppTheme } from '../lib/theme';
import { MAP_STYLES } from '../lib/map/types';

// Type icons and colors
const TYPE_CONFIG: Record<string, { icon: string; gradient: [string, string]; color: string }> = {
  fire: { icon: 'local-fire-department', gradient: ['#EF4444', '#F97316'], color: '#EF4444' },
  medical: { icon: 'medical-services', gradient: ['#3B82F6', '#06B6D4'], color: '#3B82F6' },
  traffic: { icon: 'traffic', gradient: ['#F97316', '#EAB308'], color: '#F97316' },
  violent_crime: { icon: 'warning', gradient: ['#8B5CF6', '#EC4899'], color: '#8B5CF6' },
  property_crime: { icon: 'home', gradient: ['#8B5CF6', '#6366F1'], color: '#8B5CF6' },
  disturbance: { icon: 'volume-up', gradient: ['#F59E0B', '#EAB308'], color: '#F59E0B' },
  suspicious: { icon: 'visibility', gradient: ['#6B7280', '#9CA3AF'], color: '#6B7280' },
  other: { icon: 'info', gradient: ['#6B7280', '#9CA3AF'], color: '#6B7280' },
};

// Severity colors
const SEVERITY_COLORS: Record<number, string> = {
  5: '#DC2626',
  4: '#EA580C',
  3: '#F59E0B',
  2: '#3B82F6',
  1: '#6B7280',
};

// Route params type
type DetailRouteParams = {
  IncidentDetail: {
    incident: ParsedIncident;
  };
};

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function IncidentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<DetailRouteParams, 'IncidentDetail'>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const currentUser = useNDKCurrentUser();

  // Get incident from route params
  const incident = route.params?.incident;

  // Animation for live indicator pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Comment composer state
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock comments for now (will be fetched from Nostr later)
  const [comments] = useState([
    { id: '1', author: 'Sarah M.', time: '45 min ago', text: 'I can see smoke from my window, looks contained now' },
    { id: '2', author: 'Mike J.', time: '1 hr ago', text: 'Hope everyone is safe! Heard sirens earlier' },
    { id: '3', author: 'Local Resident', time: '2 hrs ago', text: 'Heavy smoke visible from Spring Garden' },
  ]);
  const [showAllComments, setShowAllComments] = useState(false);

  // Start pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

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

  // Handle comment submit (placeholder)
  const handleCommentSubmit = useCallback(async () => {
    if (!commentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    // TODO: Implement Nostr comment publishing
    setTimeout(() => {
      setCommentText('');
      setIsSubmitting(false);
    }, 1000);
  }, [commentText, isSubmitting]);

  // Error state if no incident
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
          <Icon name="error-outline" type="material" size={64} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Couldn't load incident</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
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
            <Animated.View
              style={[
                styles.liveDot,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
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
        {/* Mini Map */}
        <View style={styles.mapContainer}>
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
            <Mapbox.PointAnnotation
              id="incident-marker"
              coordinate={[incident.location.lng, incident.location.lat]}
            >
              <View style={[styles.mapMarker, { backgroundColor: typeConfig.color }]}>
                <Icon name={typeConfig.icon} type="material" size={16} color="#FFFFFF" />
              </View>
            </Mapbox.PointAnnotation>
          </Mapbox.MapView>
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

          {comments.length === 0 ? (
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
                  <View style={styles.comment}>
                    <Avatar
                      rounded
                      size={36}
                      title={comment.author.charAt(0)}
                      containerStyle={[styles.commentAvatar, { backgroundColor: colors.primary }]}
                    />
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={[styles.commentAuthor, { color: colors.text }]}>{comment.author}</Text>
                        <Text style={[styles.commentTime, { color: colors.textMuted }]}>{comment.time}</Text>
                      </View>
                      <Text style={[styles.commentText, { color: colors.text }]}>{comment.text}</Text>
                    </View>
                  </View>
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
  mapMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0F172A',
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
});
