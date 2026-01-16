/**
 * IncidentFeedScreen
 *
 * Scrollable list view of incidents as alternative to map view.
 * Uses RNE components with theme support.
 * Reuses NDK subscription pattern from MapScreen.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Text, Card, Icon, Badge } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import geohash from 'ngeohash';
import { useSubscribe } from '@nostr-dev-kit/mobile';
import type { NDKFilter } from '@nostr-dev-kit/mobile';

import { parseIncidentEvent } from '../lib/nostr/events/incident';
import type { ParsedIncident } from '../lib/nostr/events/types';
import { INCIDENT_LIMITS } from '../lib/map/constants';
import { DEFAULT_GEOHASH_PRECISION } from '../lib/nostr/config';
import { DEFAULT_CAMERA } from '../lib/map/types';

import { ScreenContainer } from '../lib/ui';
import { useAppTheme } from '../lib/theme';

// Severity colors matching MVP spec
const SEVERITY_COLORS: Record<number, string> = {
  5: '#DC2626', // Critical - red
  4: '#EA580C', // High - orange-red
  3: '#F59E0B', // Medium - amber
  2: '#3B82F6', // Low - blue
  1: '#6B7280', // Info - gray
};

// Incident type icons
const TYPE_ICONS: Record<string, { name: string; color: string }> = {
  fire: { name: 'local-fire-department', color: '#EF4444' },
  medical: { name: 'medical-services', color: '#3B82F6' },
  traffic: { name: 'traffic', color: '#F97316' },
  violent_crime: { name: 'warning', color: '#8B5CF6' },
  property_crime: { name: 'home', color: '#8B5CF6' },
  disturbance: { name: 'volume-up', color: '#F59E0B' },
  suspicious: { name: 'visibility', color: '#6B7280' },
  other: { name: 'info', color: '#6B7280' },
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

export default function IncidentFeedScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();

  // Location state (for geohash filtering)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // =============================================================================
  // LOCATION (simplified from MapScreen)
  // =============================================================================

  useEffect(() => {
    async function getLocation() {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
          if (location) {
            setUserLocation([location.coords.longitude, location.coords.latitude]);
          }
        }
      } catch (error) {
        console.log('[IncidentFeed] Location error, using default');
      } finally {
        // Use default location if none available
        if (!userLocation) {
          setUserLocation(DEFAULT_CAMERA.centerCoordinate);
        }
        setIsLoadingLocation(false);
      }
    }

    getLocation();
  }, []);

  // =============================================================================
  // NDK SUBSCRIPTION
  // =============================================================================

  const geohashes = useMemo(() => {
    if (!userLocation) return null;

    const userGeohash = geohash.encode(
      userLocation[1], // latitude
      userLocation[0], // longitude
      DEFAULT_GEOHASH_PRECISION
    );
    const neighbors = geohash.neighbors(userGeohash);
    return [userGeohash, ...Object.values(neighbors)];
  }, [userLocation]);

  const filter = useMemo((): NDKFilter[] | false => {
    if (!geohashes) return false;

    const sinceTimestamp = Math.floor(Date.now() / 1000) - INCIDENT_LIMITS.SINCE_DAYS * 86400;

    return [{
      kinds: [30911 as number],
      '#g': geohashes,
      '#t': ['incident'],
      since: sinceTimestamp,
      limit: INCIDENT_LIMITS.FETCH_LIMIT,
    }];
  }, [geohashes]);

  const { events: rawEvents, eose } = useSubscribe(filter, {
    closeOnEose: false,
    bufferMs: 100,
  });

  // Parse and sort incidents (newest first)
  const incidents = useMemo(() => {
    const incidentMap = new Map<string, ParsedIncident>();

    for (const event of rawEvents) {
      const parsed = parseIncidentEvent(event);
      if (parsed) {
        incidentMap.set(parsed.incidentId, parsed);
      }
    }

    // Convert to array and sort by occurredAt (newest first)
    return Array.from(incidentMap.values()).sort(
      (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()
    );
  }, [rawEvents]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The subscription auto-refreshes, just show feedback
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleIncidentPress = useCallback((incident: ParsedIncident) => {
    navigation.navigate('IncidentDetail', { incident });
  }, [navigation]);

  // =============================================================================
  // RENDER ITEM
  // =============================================================================

  const renderIncidentItem = useCallback(({ item }: { item: ParsedIncident }) => {
    const severityColor = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS[1];
    const typeInfo = TYPE_ICONS[item.type] || TYPE_ICONS.other;

    return (
      <Pressable onPress={() => handleIncidentPress(item)}>
        <Card
          containerStyle={[
            styles.incidentCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderLeftColor: severityColor,
              borderLeftWidth: 4,
            },
          ]}
        >
          <View style={styles.cardRow}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${typeInfo.color}20` }]}>
              <Icon
                name={typeInfo.name}
                type="material"
                size={24}
                color={typeInfo.color}
              />
            </View>

            {/* Content */}
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={[styles.incidentTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Badge
                  value={`Sev ${item.severity}`}
                  badgeStyle={{ backgroundColor: severityColor }}
                  textStyle={styles.badgeText}
                />
              </View>

              <Text style={[styles.incidentDescription, { color: colors.textMuted }]} numberOfLines={2}>
                {item.description}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Icon name="schedule" type="material" size={14} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {formatRelativeTime(item.occurredAt)}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="location-on" type="material" size={14} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.location.address}
                  </Text>
                </View>
              </View>
            </View>

            {/* Chevron */}
            <Icon
              name="chevron-right"
              type="material"
              size={24}
              color={colors.textMuted}
            />
          </View>
        </Card>
      </Pressable>
    );
  }, [colors, handleIncidentPress]);

  // =============================================================================
  // RENDER
  // =============================================================================

  // Loading state
  if (isLoadingLocation) {
    return (
      <ScreenContainer>
        <View style={styles.centerContainer}>
          <Icon name="radar" type="material-community" size={48} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Finding your location...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <Text h2 style={[styles.title, { color: colors.text }]}>Incidents</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {incidents.length} nearby • {eose ? 'Updated' : 'Loading...'}
        </Text>
      </View>

      {/* Incident List */}
      <FlatList
        data={incidents}
        keyExtractor={(item) => item.incidentId}
        renderItem={renderIncidentItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          eose ? (
            <View style={styles.emptyState}>
              <Icon name="check-circle" type="material" size={64} color={colors.success} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All Clear</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                No incidents reported in your area
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="hourglass-empty" type="material" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Loading...</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Fetching incidents from relays
              </Text>
            </View>
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },

  // Incident Card
  incidentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    margin: 0,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  incidentDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  metaText: {
    fontSize: 12,
    flex: 1,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
