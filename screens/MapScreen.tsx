/**
 * Map Screen
 *
 * Displays a Mapbox map with real-time incident markers from Nostr kind:30911 events.
 * Uses extracted hooks for location and subscription logic.
 */

import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Mapbox from '@rnmapbox/maps';
import { Icon } from '@rneui/themed';

import { useIncidentSubscription } from '@hooks';
import { MapSkeleton } from '@components/ui';
import { useIncidentCache, useSharedLocation } from '@contexts';
import { IncidentMarker } from '@components/map';
import { DEFAULT_CAMERA, MAP_STYLES } from '@lib/map/types';
import { MAPBOX_CONFIG, USER_LOCATION, INCIDENT_LIMITS } from '@lib/map/constants';
import type { ParsedIncident } from '@lib/nostr/events/types';

// Camera animation modes
type CameraAnimationMode = 'flyTo' | 'easeTo' | 'linearTo' | 'moveTo' | 'none';
const FLY_TO_DURATION = 1500; // ms

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const { upsertMany } = useIncidentCache();

  // Delay map render until container has valid dimensions (fixes iOS 64x64 fallback)
  const [mapReady, setMapReady] = useState(false);

  // Camera state for flyTo functionality
  const [cameraCenter, setCameraCenter] = useState<[number, number] | null>(null);
  const [animationMode, setAnimationMode] = useState<CameraAnimationMode>('none');
  const [animationDuration, setAnimationDuration] = useState(0);

  // Get shared user location (fetched once in LocationProvider)
  const { location: userLocation, isLoading: isLoadingLocation } = useSharedLocation();

  // Initialize camera center when user location is available
  useEffect(() => {
    if (userLocation && !cameraCenter) {
      setCameraCenter(userLocation);
    }
  }, [userLocation, cameraCenter]);

  // Fly to user's current location
  const handleFlyToUser = useCallback(() => {
    if (!userLocation) return;

    setAnimationMode('flyTo');
    setAnimationDuration(FLY_TO_DURATION);
    setCameraCenter(userLocation);

    // Reset animation mode after completion to allow future animations
    setTimeout(() => {
      setAnimationMode('none');
      setAnimationDuration(0);
    }, FLY_TO_DURATION + 100);
  }, [userLocation]);

  // Subscribe to incidents near user location
  const {
    incidents,
    isInitialLoading,
    hasReceivedHistory,
  } = useIncidentSubscription({
    location: userLocation,
    enabled: !!userLocation,
  });

  // Cache incidents for Detail screen lookup
  useEffect(() => {
    if (incidents.length > 0) {
      upsertMany(incidents);
    }
  }, [incidents, upsertMany]);

  // Handle marker press - navigate with incidentId only (no serialization warning)
  function handleMarkerPress(incident: ParsedIncident) {
    console.log('MapScreen: Marker pressed:', incident.incidentId);
    navigation.navigate('IncidentDetail', { incidentId: incident.incidentId });
  }

  // Loading state - show animated skeleton
  if (isLoadingLocation) {
    return <MapSkeleton />;
  }

  // Determine effective camera center (fallback to default if not set)
  const effectiveCameraCenter = cameraCenter || userLocation || DEFAULT_CAMERA.centerCoordinate;

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
          <Mapbox.MapView style={styles.map} styleURL={MAP_STYLES.DARK}>
            {/* Camera with flyTo support */}
            <Mapbox.Camera
              zoomLevel={MAPBOX_CONFIG.DEFAULT_ZOOM}
              centerCoordinate={effectiveCameraCenter}
              animationMode={animationMode !== 'none' ? animationMode : undefined}
              animationDuration={animationDuration}
            />

            {/* User location marker (blue dot) */}
            {userLocation && (
              <Mapbox.PointAnnotation id="user-location" coordinate={userLocation}>
                <View style={styles.userMarker} />
              </Mapbox.PointAnnotation>
            )}

            {/* Incident markers */}
            {incidents.map((incident) => (
              <IncidentMarker
                key={incident.incidentId}
                incident={incident}
                onPress={handleMarkerPress}
              />
            ))}
          </Mapbox.MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}
      </View>

      {/* Fly to user location button (FAB) */}
      {userLocation && (
        <Pressable
          style={({ pressed }) => [
            styles.flyToButton,
            pressed && styles.flyToButtonPressed,
          ]}
          onPress={handleFlyToUser}
          accessibilityLabel="Fly to my location"
          accessibilityRole="button"
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
        <View style={styles.statsOverlay}>
          <Text style={styles.statsText}>Incidents: {incidents.length}</Text>
          <Text style={styles.statsText}>EOSE: {hasReceivedHistory ? '✓' : '...'}</Text>
        </View>
      )}

      {/* No incidents message - only show after EOSE */}
      {!isLoadingLocation && hasReceivedHistory && incidents.length === 0 && (
        <View style={styles.emptyState}>
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
    top: 20,
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
    bottom: 40,
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
  flyToButton: {
    position: 'absolute',
    bottom: 100,
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
});
