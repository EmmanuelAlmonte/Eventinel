import { Pressable, View } from 'react-native';
import { Button, Icon } from '@rneui/themed';
import { Text } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { INCIDENT_LIMITS } from '@lib/map/constants';
import type { ProcessedIncident } from '@hooks';

import type { RelayBannerStatus } from './helpers';
import type { LocationPermissionStatus } from './useMapScreenState';
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
  permission: LocationPermissionStatus;
};

function RelayStatusBanner({
  relayStatus,
  colors,
  insets,
  onRelaySettings,
}: {
  relayStatus: RelayBannerStatus;
  colors: ThemeColors;
  insets: EdgeInsets;
  onRelaySettings: () => void;
}) {
  if (!relayStatus) {
    return null;
  }

  return (
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
  );
}

function FlyToUserButton({
  colors,
  insets,
  onFlyToUser,
  isAnimating,
  userLocation,
}: {
  colors: ThemeColors;
  insets: EdgeInsets;
  userLocation: [number, number] | null;
  isAnimating: boolean;
  onFlyToUser: () => void;
}) {
  if (!userLocation) {
    return null;
  }

  return (
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
  );
}

function DevStatsOverlay({
  visibleIncidents,
  hasReceivedHistory,
  insets,
}: {
  visibleIncidents: ProcessedIncident[];
  hasReceivedHistory: boolean;
  insets: EdgeInsets;
}) {
  if (!__DEV__) {
    return null;
  }

  return (
    <View style={[styles.statsOverlay, { top: 20 + insets.top }]}>
      <Text style={styles.statsText}>Incidents: {visibleIncidents.length}</Text>
      <Text style={styles.statsText}>EOSE: {hasReceivedHistory ? '✓' : '...'}</Text>
    </View>
  );
}

function LocationDebugOverlay({
  insets,
  locationSource,
  permission,
  userLocation,
}: {
  insets: EdgeInsets;
  locationSource: string | null;
  permission: LocationPermissionStatus;
  userLocation: [number, number] | null;
}) {
  if (!__DEV__) {
    return null;
  }

  return (
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
      <Text style={styles.locationDebugText}>Perm: {permission ?? 'undetermined'}</Text>
      {userLocation ? (
        <Text style={styles.locationDebugText} numberOfLines={1}>
          {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
        </Text>
      ) : null}
    </View>
  );
}

function ViewportHint({
  insets,
  isLoadingLocation,
  isFocused,
  isViewportCoveredBySubscriptionGrid,
}: {
  insets: EdgeInsets;
  isLoadingLocation: boolean;
  isFocused: boolean;
  isViewportCoveredBySubscriptionGrid: boolean;
}) {
  if (isLoadingLocation || !isFocused || isViewportCoveredBySubscriptionGrid) {
    return null;
  }

  return (
    <View style={[styles.viewportHint, { bottom: 120 + insets.bottom }]}>
      <Text style={styles.viewportHintText}>Zoom in to load incidents for this area</Text>
    </View>
  );
}

function EmptyIncidentsState({
  insets,
  hasReceivedHistory,
  visibleIncidents,
  isLoadingLocation,
}: {
  insets: EdgeInsets;
  hasReceivedHistory: boolean;
  visibleIncidents: ProcessedIncident[];
  isLoadingLocation: boolean;
}) {
  if (isLoadingLocation || !hasReceivedHistory || visibleIncidents.length > 0) {
    return null;
  }

  return (
    <View style={[styles.emptyState, { bottom: 40 + insets.bottom }]}>
      <Text style={styles.emptyStateText}>No incidents found</Text>
      <Text style={styles.emptyStateSubtext}>
        Incidents from the last {INCIDENT_LIMITS.SINCE_DAYS} days will appear here
      </Text>
    </View>
  );
}

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
      <RelayStatusBanner
        relayStatus={relayStatus}
        colors={colors}
        insets={insets}
        onRelaySettings={onRelaySettings}
      />
      <FlyToUserButton
        colors={colors}
        insets={insets}
        userLocation={userLocation}
        isAnimating={isAnimating}
        onFlyToUser={onFlyToUser}
      />
      <DevStatsOverlay
        visibleIncidents={visibleIncidents}
        hasReceivedHistory={hasReceivedHistory}
        insets={insets}
      />
      <LocationDebugOverlay
        insets={insets}
        locationSource={locationSource}
        permission={permission}
        userLocation={userLocation}
      />
      <ViewportHint
        insets={insets}
        isLoadingLocation={isLoadingLocation}
        isFocused={isFocused}
        isViewportCoveredBySubscriptionGrid={isViewportCoveredBySubscriptionGrid}
      />
      <EmptyIncidentsState
        insets={insets}
        hasReceivedHistory={hasReceivedHistory}
        visibleIncidents={visibleIncidents}
        isLoadingLocation={isLoadingLocation}
      />
    </>
  );
}
