/**
 * Map Screen
 *
 * Displays a Mapbox map with real-time incident markers from Nostr kind:30911 events.
 * Uses extracted hooks for location and subscription logic.
 */

import { useEffect, useState, useCallback, useRef, useMemo, type ElementRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox, { type MapState } from '@rnmapbox/maps';
import { Button, Icon } from '@rneui/themed';

import { LocationRequiredEmpty, MapSkeleton, ScreenContainer } from '@components/ui';
import { useRelayStatus, useSharedLocation, useSharedIncidents } from '@contexts';
import { useAppTheme, type ProcessedIncident } from '@hooks';
import { DEFAULT_CAMERA, MAP_STYLES, SEVERITY_COLORS, incidentsToFeatureCollection } from '@lib/map/types';
import { MAPBOX_CONFIG, USER_LOCATION, INCIDENT_LIMITS, INCIDENT_MARKER } from '@lib/map/constants';

// Camera animation modes
type CameraAnimationMode = 'flyTo' | 'easeTo' | 'linearTo' | 'moveTo' | 'none';
const FLY_TO_DURATION = 1500; // ms
const AUTO_RESUME_DELAY_MS = 20000;
const MAX_RELAY_LABELS = 2;
const INCIDENT_SOURCE_ID = 'incidents-source';
const CLUSTER_LAYER_ID = 'incident-clusters';
const CLUSTER_COUNT_LAYER_ID = 'incident-cluster-count';
const INCIDENT_LAYER_ID = 'incident-points';
const INCIDENT_LABEL_LAYER_ID = 'incident-point-labels';
const CLUSTER_RADIUS = 52;
const EMPTY_INCIDENTS: ProcessedIncident[] = [];

type ShapeSourcePressEvent = {
  features: Array<GeoJSON.Feature>;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  point: {
    x: number;
    y: number;
  };
};

type CameraRef = ElementRef<typeof Mapbox.Camera>;
type ShapeSourceRef = ElementRef<typeof Mapbox.ShapeSource>;

const clusterFilter = ['has', 'point_count'] as const;
const pointFilter = ['!', ['has', 'point_count']] as const;

const clusterCircleColorExpression = [
  'step',
  ['get', 'point_count'],
  '#60a5fa',
  10,
  '#3b82f6',
  25,
  '#2563eb',
  50,
  '#1d4ed8',
] as const;

const clusterCircleRadiusExpression = [
  'step',
  ['get', 'point_count'],
  18,
  10,
  22,
  25,
  26,
  50,
  30,
] as const;

const incidentCircleColorExpression = [
  'match',
  ['get', 'severity'],
  1,
  SEVERITY_COLORS[1],
  2,
  SEVERITY_COLORS[2],
  3,
  SEVERITY_COLORS[3],
  4,
  SEVERITY_COLORS[4],
  5,
  SEVERITY_COLORS[5],
  SEVERITY_COLORS[1],
] as const;

const clusterCircleStyle = {
  circleColor: clusterCircleColorExpression,
  circleRadius: clusterCircleRadiusExpression,
  circleStrokeColor: INCIDENT_MARKER.PIN_BORDER_COLOR,
  circleStrokeWidth: INCIDENT_MARKER.PIN_BORDER_WIDTH,
  circleOpacity: 0.9,
};

const clusterCountStyle = {
  textField: ['get', 'point_count_abbreviated'] as const,
  textSize: 12,
  textColor: '#ffffff',
  textAllowOverlap: true,
  textIgnorePlacement: true,
};

const incidentCircleStyle = {
  circleColor: incidentCircleColorExpression,
  circleRadius: INCIDENT_MARKER.PIN_SIZE / 2,
  circleStrokeColor: INCIDENT_MARKER.PIN_BORDER_COLOR,
  circleStrokeWidth: INCIDENT_MARKER.PIN_BORDER_WIDTH,
  circleOpacity: 0.95,
};

const incidentLabelStyle = {
  textField: ['to-string', ['get', 'severity']] as const,
  textSize: INCIDENT_MARKER.TEXT_FONT_SIZE,
  textColor: INCIDENT_MARKER.TEXT_COLOR,
  textAllowOverlap: true,
  textIgnorePlacement: true,
  textAnchor: 'center' as const,
};

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

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { hasConnectedRelay, hasRelays, isConnecting, relays } = useRelayStatus();

  // Delay map render until container has valid dimensions (fixes iOS 64x64 fallback)
  const [mapReady, setMapReady] = useState(false);

  // Camera state for flyTo functionality
  const [cameraCenter, setCameraCenter] = useState<[number, number] | null>(null);
  const [animationMode, setAnimationMode] = useState<CameraAnimationMode>('none');
  const [animationDuration, setAnimationDuration] = useState(0);
  const [followUser, setFollowUser] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingRef = useRef(false);
  const shapeSourceRef = useRef<ShapeSourceRef | null>(null);
  const cameraRef = useRef<CameraRef | null>(null);

  // Get shared user location (fetched once in LocationProvider)
  const {
    location: userLocation,
    isLoading: isLoadingLocation,
    source: locationSource,
    permission,
    refresh: refreshLocation,
  } = useSharedLocation();

  // Update camera center when user location changes (including from default to real GPS)
  useEffect(() => {
    if (userLocation && followUser) {
      setCameraCenter(userLocation);
    }
  }, [userLocation, followUser]);

  useEffect(() => {
    return () => {
      if (animationResetTimerRef.current) {
        clearTimeout(animationResetTimerRef.current);
        animationResetTimerRef.current = null;
      }
      if (autoResumeTimerRef.current) {
        clearTimeout(autoResumeTimerRef.current);
        autoResumeTimerRef.current = null;
      }
    };
  }, []);

  const clearAutoResumeTimer = useCallback(() => {
    if (autoResumeTimerRef.current) {
      clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = null;
    }
  }, []);

  const startFlyTo = useCallback((target: [number, number]) => {
    if (isAnimatingRef.current) {
      return false;
    }

    isAnimatingRef.current = true;
    setIsAnimating(true);

    if (animationResetTimerRef.current) {
      clearTimeout(animationResetTimerRef.current);
    }

    setAnimationMode('flyTo');
    setAnimationDuration(FLY_TO_DURATION);
    setCameraCenter(target);

    animationResetTimerRef.current = setTimeout(() => {
      setAnimationMode('none');
      setAnimationDuration(0);
      isAnimatingRef.current = false;
      setIsAnimating(false);
      animationResetTimerRef.current = null;
    }, FLY_TO_DURATION + 100);

    return true;
  }, []);

  const scheduleAutoResume = useCallback(() => {
    clearAutoResumeTimer();

    autoResumeTimerRef.current = setTimeout(() => {
      autoResumeTimerRef.current = null;
      if (!userLocation || isAnimatingRef.current) {
        return;
      }
      setFollowUser(true);
      startFlyTo(userLocation);
    }, AUTO_RESUME_DELAY_MS);
  }, [clearAutoResumeTimer, startFlyTo, userLocation]);

  // Fly to user's current location
  const handleFlyToUser = useCallback(() => {
    if (!userLocation || isAnimatingRef.current) return;

    clearAutoResumeTimer();
    setFollowUser(true);
    startFlyTo(userLocation);
  }, [userLocation, clearAutoResumeTimer, startFlyTo]);

  const handleCameraChanged = useCallback((state: MapState) => {
    if (!state?.gestures?.isGestureActive) {
      return;
    }

    if (animationResetTimerRef.current) {
      clearTimeout(animationResetTimerRef.current);
      animationResetTimerRef.current = null;
    }

    if (isAnimatingRef.current) {
      isAnimatingRef.current = false;
      setIsAnimating(false);
      setAnimationMode('none');
      setAnimationDuration(0);
    }

    if (followUser) {
      setFollowUser(false);
    }

    scheduleAutoResume();
  }, [followUser, scheduleAutoResume]);

  // Get shared incidents (single subscription from IncidentSubscriptionProvider)
  const {
    incidents,
    isInitialLoading,
    hasReceivedHistory,
    setMapFocused,
  } = useSharedIncidents();

  useEffect(() => {
    setMapFocused(isFocused);
    return () => {
      setMapFocused(false);
    };
  }, [isFocused, setMapFocused]);

  const visibleIncidents = isFocused ? incidents : EMPTY_INCIDENTS;

  const incidentFeatureCollection = useMemo(
    () => incidentsToFeatureCollection(visibleIncidents),
    [visibleIncidents]
  );

  const handleIncidentPress = useCallback((incidentId: string) => {
    navigation.navigate('IncidentDetail', { incidentId });
  }, [navigation]);

  const handleRelaySettings = useCallback(() => {
    navigation.navigate('Relays');
  }, [navigation]);

  const relayLabel = formatRelayList(relays.map((relay) => relay.url));

  const relayStatus = !hasConnectedRelay
    ? {
        icon: !hasRelays ? 'cloud-off' : isConnecting ? 'wifi' : 'wifi-off',
        title: !hasRelays
          ? 'No Relays Connected'
          : isConnecting
            ? 'Connecting to relays'
            : 'Relays disconnected',
        description: !hasRelays
          ? 'Add a Nostr relay to start receiving incident updates.'
          : isConnecting
            ? `Waiting for ${relayLabel} to connect.`
            : `Unable to reach ${relayLabel}. Check your connection or relay settings.`,
        actionLabel: !hasRelays ? 'Add Relay' : 'Relay Settings',
      }
    : null;

  // Loading state - show animated skeleton
  if (isLoadingLocation) {
    return <MapSkeleton />;
  }

  if (!userLocation) {
    return (
      <ScreenContainer>
        <LocationRequiredEmpty
          permission={permission}
          onRetry={() => void refreshLocation()}
        />
      </ScreenContainer>
    );
  }

  // Determine effective camera center (fallback to default if not set)
  const effectiveCameraCenter = cameraCenter || userLocation || DEFAULT_CAMERA.centerCoordinate;
  const cameraCenterCoordinate = followUser ? effectiveCameraCenter : undefined;

  const handleShapeSourcePress = useCallback((event: ShapeSourcePressEvent) => {
    const feature = event?.features?.[0];
    if (!feature || !feature.properties) {
      return;
    }

    const properties = feature.properties as Record<string, unknown>;

    if (properties.cluster) {
      if (!feature.geometry || feature.geometry.type !== 'Point') {
        return;
      }

      const coordinates = feature.geometry.coordinates as [number, number];

      clearAutoResumeTimer();
      setFollowUser(false);

      void (async () => {
        const zoom = await shapeSourceRef.current?.getClusterExpansionZoom(feature);
        if (zoom == null) {
          return;
        }

        cameraRef.current?.setCamera({
          centerCoordinate: coordinates,
          zoomLevel: zoom,
          animationDuration: 400,
          animationMode: 'easeTo',
        });

        scheduleAutoResume();
      })();

      return;
    }

    const incidentId = properties.incidentId;
    if (typeof incidentId === 'string' && incidentId.length > 0) {
      handleIncidentPress(incidentId);
    }
  }, [clearAutoResumeTimer, handleIncidentPress, scheduleAutoResume]);

  return (
    <View style={styles.container}>
      {/* Map container - onLayout delays render until valid dimensions (iOS fix) */}
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
            style={styles.map}
            styleURL={MAP_STYLES.DARK}
            onCameraChanged={handleCameraChanged}
          >
            {/* Camera with flyTo support */}
            <Mapbox.Camera
              ref={cameraRef}
              zoomLevel={MAPBOX_CONFIG.DEFAULT_ZOOM}
              centerCoordinate={cameraCenterCoordinate}
              animationMode={animationMode !== 'none' ? animationMode : undefined}
              animationDuration={animationDuration}
            />

            {/* User location marker (blue dot) */}
            {userLocation && (
              <Mapbox.PointAnnotation id="user-location" coordinate={userLocation}>
                <View style={styles.userMarker} />
              </Mapbox.PointAnnotation>
            )}

            {/* Incident markers (ShapeSource + clustering) */}
            <Mapbox.ShapeSource
              id={INCIDENT_SOURCE_ID}
              ref={shapeSourceRef}
              shape={incidentFeatureCollection}
              cluster
              clusterRadius={CLUSTER_RADIUS}
              hitbox={{ width: 44, height: 44 }}
              onPress={handleShapeSourcePress}
            >
              <Mapbox.CircleLayer
                id={CLUSTER_LAYER_ID}
                filter={clusterFilter}
                style={clusterCircleStyle}
              />
              <Mapbox.SymbolLayer
                id={CLUSTER_COUNT_LAYER_ID}
                filter={clusterFilter}
                style={clusterCountStyle}
              />
              <Mapbox.CircleLayer
                id={INCIDENT_LAYER_ID}
                filter={pointFilter}
                style={incidentCircleStyle}
              />
              <Mapbox.SymbolLayer
                id={INCIDENT_LABEL_LAYER_ID}
                filter={pointFilter}
                style={incidentLabelStyle}
              />
            </Mapbox.ShapeSource>
          </Mapbox.MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}
      </View>

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
            <Icon
              name={relayStatus.icon}
              type="material"
              size={18}
              color={colors.textMuted}
            />
            <Text style={[styles.relayBannerTitle, { color: colors.text }]}>{relayStatus.title}</Text>
          </View>
          <Text style={[styles.relayBannerDescription, { color: colors.textMuted }]}>
            {relayStatus.description}
          </Text>
          <Button
            title={relayStatus.actionLabel}
            onPress={handleRelaySettings}
            type="clear"
            containerStyle={styles.relayBannerActionContainer}
            titleStyle={[styles.relayBannerActionText, { color: colors.primary }]}
          />
        </View>
      )}

      {/* Fly to user location button (FAB) */}
      {userLocation && (
        <Pressable
          style={({ pressed }) => [
            styles.flyToButton,
            { bottom: 100 + insets.bottom },
            pressed && styles.flyToButtonPressed,
          ]}
          disabled={isAnimating}
          onPress={handleFlyToUser}
          accessibilityLabel="Fly to my location"
          accessibilityRole="button"
          accessibilityState={{ disabled: isAnimating }}
        >
          <Icon
            name="my-location"
            type="material"
            size={24}
            color="#FFFFFF"
          />
        </Pressable>
      )}

      {/* Stats overlay (top-right) - DEV only */}
      {__DEV__ && (
        <View style={[styles.statsOverlay, { top: 20 + insets.top }]}>
          <Text style={styles.statsText}>Incidents: {visibleIncidents.length}</Text>
          <Text style={styles.statsText}>EOSE: {hasReceivedHistory ? '✓' : '...'}</Text>
        </View>
      )}

      {/* Location debug overlay (top-left) - DEV only */}
      {__DEV__ && (
        <View style={[styles.locationDebugOverlay, { top: 20 + insets.top }]}>
          <Text style={[
            styles.locationSourceText,
            locationSource === 'fresh' && styles.locationSourceFresh,
            locationSource === 'cached' && styles.locationSourceCached,
            locationSource === 'default' && styles.locationSourceDefault,
          ]}>
            📍 {locationSource?.toUpperCase() || 'NONE'}
          </Text>
          <Text style={styles.locationDebugText}>Perm: {permission}</Text>
          {userLocation && (
            <Text style={styles.locationDebugText} numberOfLines={1}>
              {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
            </Text>
          )}
        </View>
      )}

      {/* No incidents message - only show after EOSE */}
      {!isLoadingLocation && hasReceivedHistory && visibleIncidents.length === 0 && (
        <View style={[styles.emptyState, { bottom: 40 + insets.bottom }]}>
          <Text style={styles.emptyStateText}>No incidents found</Text>
          <Text style={styles.emptyStateSubtext}>
            Incidents from the last {INCIDENT_LIMITS.SINCE_DAYS} days will appear here
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarker: {
    width: USER_LOCATION.MARKER_SIZE,
    height: USER_LOCATION.MARKER_SIZE,
    borderRadius: USER_LOCATION.MARKER_SIZE / 2,
    backgroundColor: USER_LOCATION.MARKER_COLOR,
    borderWidth: USER_LOCATION.MARKER_BORDER_WIDTH,
    borderColor: USER_LOCATION.MARKER_BORDER_COLOR,
  },
  statsOverlay: {
    position: 'absolute',
    // top is set dynamically with insets.top
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    position: 'absolute',
    // bottom is set dynamically with insets.bottom
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    color: '#ccc',
    fontSize: 13,
    textAlign: 'center',
  },
  relayBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  relayBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  relayBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  relayBannerDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  relayBannerActionContainer: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  relayBannerActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  flyToButton: {
    position: 'absolute',
    // bottom is set dynamically with insets.bottom
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  flyToButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  // Location debug overlay styles
  locationDebugOverlay: {
    position: 'absolute',
    // top is set dynamically with insets.top
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
  },
  locationSourceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationSourceFresh: {
    color: '#22c55e', // green - GPS is working!
  },
  locationSourceCached: {
    color: '#eab308', // yellow - using cached
  },
  locationSourceDefault: {
    color: '#ef4444', // red - stuck on default!
  },
  locationDebugText: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
