/**
 * Map Screen
 *
 * Displays a Mapbox map with real-time incident markers from Nostr kind:30911 events.
 * Uses extracted hooks for location and subscription logic.
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Mapbox from '@rnmapbox/maps';

import { useUserLocation, useIncidentSubscription } from '@hooks';
import { useIncidentCache } from '@contexts';
import { IncidentMarker } from '@components/map';
import { DEFAULT_CAMERA, MAP_STYLES } from '@lib/map/types';
import { MAPBOX_CONFIG, USER_LOCATION, INCIDENT_LIMITS } from '@lib/map/constants';
import type { ParsedIncident } from '@lib/nostr/events/types';

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const { upsertMany } = useIncidentCache();

  // Delay map render until container has valid dimensions (fixes iOS 64x64 fallback)
  const [mapReady, setMapReady] = useState(false);

  // Get user location with fallback to default
  const { location: userLocation, isLoading: isLoadingLocation } = useUserLocation({
    fallback: 'default',
    defaultLocation: DEFAULT_CAMERA.centerCoordinate,
  });

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

  // Loading state
  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  // Determine camera center
  const cameraCenter = userLocation || DEFAULT_CAMERA.centerCoordinate;

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
            {/* Camera */}
            <Mapbox.Camera
              zoomLevel={MAPBOX_CONFIG.DEFAULT_ZOOM}
              centerCoordinate={cameraCenter}
              animationDuration={0}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
});
