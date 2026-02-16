import { Pressable, View } from 'react-native';
import { Button, Icon } from '@rneui/themed';
import { Text } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { INCIDENT_LIMITS } from '@lib/map/constants';
import type { ProcessedIncident } from '@hooks';

import type { RelayBannerStatus } from './helpers';
import { mapScreenStyles as styles } from './styles';

type ThemeColors = {
  border: string;
  primary: string;
  surface: string;
  text: string;
  textMuted: string;
};

type MapOverlaysProps = {
  colors: ThemeColors;
  insets: EdgeInsets;
  relayStatus: RelayBannerStatus;
  onRelaySettings: () => void;
  userLocation: [number, number] | null;
  isAnimating: boolean;
  onFlyToUser: () => void;
  visibleIncidents: ProcessedIncident[];
  hasReceivedHistory: boolean;
  isLoadingLocation: boolean;
  isFocused: boolean;
  isViewportCoveredBySubscriptionGrid: boolean;
  locationSource: string | null;
  permission: string;
};

export function MapOverlays({
  colors,
  insets,
  relayStatus,
  onRelaySettings,
  userLocation,
  isAnimating,
  onFlyToUser,
  visibleIncidents,
  hasReceivedHistory,
  isLoadingLocation,
  isFocused,
  isViewportCoveredBySubscriptionGrid,
  locationSource,
  permission,
}: MapOverlaysProps) {
  return (
    <>
      {relayStatus && (
        <View
          style={[
            styles.relayBanner,
            {
              top: 16 + insets.top,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.relayBannerHeader}>
            <Icon name={relayStatus.icon} type="material" size={18} color={colors.textMuted} />
            <Text style={[styles.relayBannerTitle, { color: colors.text }]}>{relayStatus.title}</Text>
          </View>
          <Text style={[styles.relayBannerDescription, { color: colors.textMuted }]}>
            {relayStatus.description}
          </Text>
          <Button
            title={relayStatus.actionLabel}
            onPress={onRelaySettings}
            type="clear"
            containerStyle={styles.relayBannerActionContainer}
            titleStyle={[styles.relayBannerActionText, { color: colors.primary }]}
          />
        </View>
      )}

      {userLocation && (
        <Pressable
          style={({ pressed }) => [
            styles.flyToButton,
            { bottom: 100 + insets.bottom },
            pressed && styles.flyToButtonPressed,
          ]}
          disabled={isAnimating}
          onPress={onFlyToUser}
          accessibilityLabel="Fly to my location"
          accessibilityRole="button"
          accessibilityState={{ disabled: isAnimating }}
        >
          <Icon name="my-location" type="material" size={24} color="#FFFFFF" />
        </Pressable>
      )}

      {__DEV__ && (
        <View style={[styles.statsOverlay, { top: 20 + insets.top }]}>
          <Text style={styles.statsText}>Incidents: {visibleIncidents.length}</Text>
          <Text style={styles.statsText}>EOSE: {hasReceivedHistory ? '✓' : '...'}</Text>
        </View>
      )}

      {__DEV__ && (
        <View style={[styles.locationDebugOverlay, { top: 20 + insets.top }]}>
          <Text
            style={[
              styles.locationSourceText,
              locationSource === 'fresh' && styles.locationSourceFresh,
              locationSource === 'cached' && styles.locationSourceCached,
              locationSource === 'default' && styles.locationSourceDefault,
            ]}
          >
            📍 {locationSource?.toUpperCase() || 'NONE'}
          </Text>
          <Text style={styles.locationDebugText}>Perm: {permission}</Text>
          {userLocation ? (
            <Text style={styles.locationDebugText} numberOfLines={1}>
              {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
            </Text>
          ) : null}
        </View>
      )}

      {!isLoadingLocation && isFocused && !isViewportCoveredBySubscriptionGrid && (
        <View style={[styles.viewportHint, { bottom: 120 + insets.bottom }]}>
          <Text style={styles.viewportHintText}>Zoom in to load incidents for this area</Text>
        </View>
      )}

      {!isLoadingLocation && hasReceivedHistory && visibleIncidents.length === 0 && (
        <View style={[styles.emptyState, { bottom: 40 + insets.bottom }]}>
          <Text style={styles.emptyStateText}>No incidents found</Text>
          <Text style={styles.emptyStateSubtext}>
            Incidents from the last {INCIDENT_LIMITS.SINCE_DAYS} days will appear here
          </Text>
        </View>
      )}
    </>
  );
}
