/**
 * IncidentFeedScreen
 *
 * Scrollable list view of incidents as alternative to map view.
 * Uses extracted hooks for location and subscription logic.
 */

import { useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Text, Card, Icon, Badge } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';

import { useAppTheme } from '@hooks';
import type { ProcessedIncident } from '@hooks';
import { useRelayStatus, useSharedLocation, useSharedIncidents } from '@contexts';
import { EmptyState, NoRelaysEmpty, ScreenContainer, SkeletonList } from '@components/ui';
import { SEVERITY_COLORS, TYPE_CONFIG } from '@lib/nostr/config';
import { formatRelativeTimeMs } from '@lib/utils/time';

const MAX_RELAY_LABELS = 2;

function formatRelayList(relayUrls: string[]): string {
  if (!relayUrls || relayUrls.length === 0) return 'relays';
  const cleaned = relayUrls
    .map((relay) => relay.replace(/^wss?:\/\//, ''))
    .filter((relay) => relay.length > 0);
  if (cleaned.length <= MAX_RELAY_LABELS) {
    return cleaned.join(', ');
  }
  return `${cleaned.slice(0, MAX_RELAY_LABELS).join(', ')} +${cleaned.length - MAX_RELAY_LABELS} more`;
}

export default function IncidentFeedScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { hasConnectedRelay, hasRelays, isConnecting, relays } = useRelayStatus();

  // Get shared user location (fetched once in LocationProvider)
  const { location: userLocation, isLoading: isLoadingLocation } = useSharedLocation();

  // Get shared incidents (single subscription from IncidentSubscriptionProvider)
  const {
    incidents,
    hasReceivedHistory,
  } = useSharedIncidents();

  // Handle incident press - navigate with incidentId only (no serialization warning)
  const handleIncidentPress = useCallback((incident: ProcessedIncident) => {
    navigation.navigate('IncidentDetail', { incidentId: incident.incidentId });
  }, [navigation]);

  const handleRelaySettings = useCallback(() => {
    navigation.navigate('Relays');
  }, [navigation]);

  const relayLabel = formatRelayList(relays.map((relay) => relay.url));

  if (!hasConnectedRelay) {
    if (!hasRelays) {
      return (
        <ScreenContainer>
          <NoRelaysEmpty onAddRelay={handleRelaySettings} />
        </ScreenContainer>
      );
    }

    return (
      <ScreenContainer>
        <EmptyState
          icon={isConnecting ? 'wifi' : 'wifi-off'}
          title={isConnecting ? 'Connecting to relays' : 'Relays disconnected'}
          description={
            isConnecting
              ? `Waiting for ${relayLabel} to connect.`
              : `Unable to reach ${relayLabel}. Check your connection or relay settings.`
          }
          action="Relay Settings"
          onAction={handleRelaySettings}
        />
      </ScreenContainer>
    );
  }

  // Render incident item
  const renderIncidentItem = useCallback(({ item }: { item: ProcessedIncident }) => {
    const severityColor = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS[1];
    const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;

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
            <View style={[styles.iconContainer, { backgroundColor: `${typeConfig.color}20` }]}>
              <Icon
                name={typeConfig.icon}
                type="material"
                size={24}
                color={typeConfig.color}
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
                    {formatRelativeTimeMs(item.occurredAtMs)}
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

  // Loading state - show animated skeleton cards
  if (isLoadingLocation) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Text h2 style={[styles.title, { color: colors.text }]}>Incidents</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Finding your location...
          </Text>
        </View>
        <SkeletonList count={4} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <Text h2 style={[styles.title, { color: colors.text }]}>Incidents</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {incidents.length} nearby {hasReceivedHistory ? '• Updated' : '• Loading...'}
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
            refreshing={false}
            onRefresh={() => {}}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          hasReceivedHistory ? (
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
