/**
 * Map Screen
 *
 * Displays a Mapbox map with real-time incident markers from Nostr kind:30911 events.
 * Features:
 * - User location (blue dot) with permission request
 * - Incident markers with severity-based colors
 * - Tap markers to show incident details
 * - Real-time updates via NDK subscription
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { ndk } from '../lib/ndk';
import { parseIncidentEvent } from '../lib/nostr/events/incident';
import type { ParsedIncident } from '../lib/nostr/events/types';
import { IncidentMarker } from '../lib/map/IncidentMarker';
import { DEFAULT_CAMERA, MAP_STYLES } from '../lib/map/types';
import { MAPBOX_CONFIG, INCIDENT_LIMITS, USER_LOCATION } from '../lib/map/constants';

// Set Mapbox access token programmatically as fallback
// This ensures the token is set even if app.config.js doesn't work
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYXRlbW1hIiwiYSI6ImNtanU3ZXFiaTN0b2Yza29qMzkwamJ3cTUifQ.AT45ZkDDVgwxjajd2KcUcA';
try {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
  console.log('MapScreen: Mapbox token set programmatically');
} catch (error) {
  console.error('MapScreen: Failed to set Mapbox token:', error);
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function MapScreen() {
  // Location state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Incident data state
  const [incidents, setIncidents] = useState<Map<string, ParsedIncident>>(new Map());
  const [selectedIncident, setSelectedIncident] = useState<ParsedIncident | null>(null);

  // Stats for debugging
  const [eventCount, setEventCount] = useState(0);

  // =============================================================================
  // LOCATION PERMISSION & FETCH
  // =============================================================================

  useEffect(() => {
    // Safety timeout in case everything hangs
    const timeoutId = setTimeout(() => {
      console.warn('MapScreen: Location flow taking too long, using default location');
      setIsLoading(false);
      setUserLocation(DEFAULT_CAMERA.centerCoordinate);
    }, 15000);

    // Proper async wrapper pattern for useEffect
    const fetchLocation = async () => {
      try {
        await requestLocationPermission();
      } catch (error) {
        console.error('MapScreen: Unexpected error in location flow:', error);
        setUserLocation(DEFAULT_CAMERA.centerCoordinate);
        setIsLoading(false);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    fetchLocation();

    return () => clearTimeout(timeoutId);
  }, []);

  async function requestLocationPermission() {
    try {
      console.log('MapScreen: [1/6] Starting location permission flow...');

      // First, check current permission status without requesting
      console.log('MapScreen: [2/6] Checking current foreground permission status...');
      const currentStatus = await Location.getForegroundPermissionsAsync();
      console.log('MapScreen: [3/6] Current permission status:', {
        status: currentStatus.status,
        granted: currentStatus.granted,
        canAskAgain: currentStatus.canAskAgain,
      });

      let foregroundResult = currentStatus;

      // Only request if not already granted
      if (currentStatus.status !== 'granted') {
        console.log('MapScreen: [4/6] Permission not granted, requesting foreground permission...');
        foregroundResult = await Location.requestForegroundPermissionsAsync();
        console.log('MapScreen: Permission request result:', foregroundResult.status);
      } else {
        console.log('MapScreen: [4/6] Permission already granted, skipping request');
      }

      if (foregroundResult.status !== 'granted') {
        console.log('MapScreen: [X] Foreground permission denied');
        Alert.alert(
          'Location Permission Required',
          'Eventinel needs location access to show incidents near you on the map.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      // Background location permission (enables "Always allow" option)
      // IMPORTANT: On Android 11+ (API 30+), background location cannot be requested
      // via popup - user must manually enable in Settings. So we skip it on Android
      // to prevent hanging. iOS works fine with the direct request.
      if (Platform.OS === 'ios') {
        try {
          console.log('MapScreen: [5/6] Checking background location permission (iOS)...');
          const bgCurrentStatus = await Location.getBackgroundPermissionsAsync();
          console.log('MapScreen: Background status:', bgCurrentStatus.status);

          // Only request background if not already granted
          if (bgCurrentStatus.status !== 'granted') {
            console.log('MapScreen: Requesting background location permission...');
            const backgroundResult = await Location.requestBackgroundPermissionsAsync();
            console.log('MapScreen: Background permission result:', backgroundResult.status);
          } else {
            console.log('MapScreen: Background permission already granted');
          }
        } catch (bgError) {
          console.warn('MapScreen: Background permission request failed:', bgError);
          // Continue anyway - foreground permission is sufficient
        }
      } else {
        // Android: Skip background permission request (causes hang on Android 11+)
        console.log('MapScreen: [5/6] Skipping background permission on Android (requires Settings)');
      }

      // Get current location - try cached first (instant), then fresh (slow on emulators)
      console.log('MapScreen: [6/6] Fetching current location...');

      let location: Location.LocationObject | null = null;

      // First, try to get last known position (instant, no GPS needed)
      try {
        console.log('MapScreen: Trying getLastKnownPositionAsync (cached)...');
        location = await Location.getLastKnownPositionAsync({
          maxAge: 60000, // Accept cached location up to 60 seconds old
        });
        if (location) {
          console.log('MapScreen: Got cached location:', location.coords.latitude, location.coords.longitude);
        }
      } catch (cacheError) {
        console.log('MapScreen: No cached location available');
      }

      // If no cached location, try to get fresh position with short timeout
      if (!location) {
        console.log('MapScreen: Trying getCurrentPositionAsync (fresh)...');

        let timeoutId: ReturnType<typeof setTimeout>;
        let didTimeout = false;

        try {
          location = await Promise.race([
            (async () => {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High, // High accuracy works better on Android
                // forceAndroidLocationManager bypasses FusedLocationProvider which hangs on emulators
                ...(Platform.OS === 'android' && {
                  // @ts-ignore - valid option but not in types
                  forceAndroidLocationManager: true,
                }),
              });
              if (didTimeout) {
                console.log('MapScreen: Location arrived after timeout, ignoring');
                return null;
              }
              return loc;
            })(),
            new Promise<null>((resolve) => {
              timeoutId = setTimeout(() => {
                console.log('MapScreen: ⏱️ Location timeout reached (5s)');
                didTimeout = true;
                resolve(null);
              }, 5000);
            }),
          ]) as Location.LocationObject | null;

          clearTimeout(timeoutId!);

          if (location) {
            console.log('MapScreen: Got fresh location');
          } else {
            console.log('MapScreen: Location request timed out');
          }
        } catch (err) {
          console.log('MapScreen: getCurrentPositionAsync error:', err);
        }
      }

      // If still no location, throw to trigger fallback
      if (!location) {
        throw new Error('Could not get location from device');
      }

      const userCoordinate: [number, number] = [
        location.coords.longitude,
        location.coords.latitude,
      ];

      console.log('MapScreen: ✅ Location obtained:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });

      setUserLocation(userCoordinate);
      setIsLoading(false);

      console.log('MapScreen: ✅ Map ready with user location');
    } catch (error) {
      console.log('MapScreen: Location unavailable, using default:', error);

      // Use default location (Philadelphia) if location fetch fails
      // This is normal for emulators - no alert needed
      const defaultCoordinate: [number, number] = DEFAULT_CAMERA.centerCoordinate;
      setUserLocation(defaultCoordinate);
      setIsLoading(false);

      console.log('MapScreen: ✅ Map ready with default location (Philadelphia)');
    }
  }

  // =============================================================================
  // NDK SUBSCRIPTION
  // =============================================================================

  useEffect(() => {
    if (!ndk.pool) {
      console.warn('MapScreen: NDK pool not initialized');
      return;
    }

    console.log('MapScreen: Starting incident subscription');

    // Calculate timestamp for "since" filter (last N days)
    const sinceTimestamp =
      Math.floor(Date.now() / 1000) - INCIDENT_LIMITS.SINCE_DAYS * 86400;

    // Subscribe to kind:30911 incidents with incident tag
    const subscription = ndk.subscribe(
      {
        kinds: [30911],
        '#t': ['incident'],
        since: sinceTimestamp,
        limit: INCIDENT_LIMITS.FETCH_LIMIT,
      },
      { closeOnEose: false }
    );

    // Handle incoming events
    subscription.on('event', (event) => {
      const parsed = parseIncidentEvent(event);

      if (parsed) {
        setIncidents((prev) => {
          const next = new Map(prev);

          // Implement LRU eviction if cache is full
          if (next.size >= INCIDENT_LIMITS.MAX_CACHE) {
            const oldest = Array.from(next.keys())[0];
            next.delete(oldest);
            console.log('MapScreen: Evicted oldest incident:', oldest);
          }

          next.set(parsed.incidentId, parsed);
          return next;
        });

        setEventCount((prev) => prev + 1);
      } else {
        console.warn('MapScreen: Failed to parse incident event:', event.id);
      }
    });

    // Handle end of stored events
    subscription.on('eose', () => {
      console.log('MapScreen: End of stored events (EOSE)');
    });

    // Cleanup on unmount
    return () => {
      console.log('MapScreen: Stopping incident subscription');
      subscription.stop();
    };
  }, []);

  // =============================================================================
  // MARKER INTERACTION
  // =============================================================================

  function handleMarkerPress(incident: ParsedIncident) {
    console.log('MapScreen: Marker pressed:', incident.incidentId);
    setSelectedIncident(incident);
  }

  function dismissDetails() {
    setSelectedIncident(null);
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  // Determine camera center (user location or default)
  const cameraCenter = userLocation || DEFAULT_CAMERA.centerCoordinate;

  return (
    <View style={styles.container}>
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
        {Array.from(incidents.values()).map((incident) => (
          <IncidentMarker
            key={incident.incidentId}
            incident={incident}
            onPress={handleMarkerPress}
          />
        ))}
      </Mapbox.MapView>

      {/* Stats overlay (top-right) */}
      <View style={styles.statsOverlay}>
        <Text style={styles.statsText}>Incidents: {incidents.size}</Text>
        <Text style={styles.statsText}>Events: {eventCount}</Text>
      </View>

      {/* Incident details card (bottom) */}
      {selectedIncident && (
        <TouchableOpacity
          style={styles.detailsCard}
          onPress={dismissDetails}
          activeOpacity={0.95}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailTitle}>{selectedIncident.title}</Text>
              <View
                style={[
                  styles.severityBadge,
                  {
                    backgroundColor:
                      selectedIncident.severity >= 4
                        ? '#ef4444'
                        : selectedIncident.severity >= 3
                          ? '#f97316'
                          : '#eab308',
                  },
                ]}
              >
                <Text style={styles.severityBadgeText}>
                  Severity {selectedIncident.severity}
                </Text>
              </View>
            </View>

            <Text style={styles.detailDescription}>{selectedIncident.description}</Text>

            <View style={styles.detailMeta}>
              <Text style={styles.detailMetaLabel}>Location:</Text>
              <Text style={styles.detailMetaValue}>{selectedIncident.location.address}</Text>
            </View>

            <View style={styles.detailMeta}>
              <Text style={styles.detailMetaLabel}>Type:</Text>
              <Text style={styles.detailMetaValue}>{selectedIncident.type}</Text>
            </View>

            <View style={styles.detailMeta}>
              <Text style={styles.detailMetaLabel}>Source:</Text>
              <Text style={styles.detailMetaValue}>{selectedIncident.source}</Text>
            </View>

            <View style={styles.detailMeta}>
              <Text style={styles.detailMetaLabel}>Occurred:</Text>
              <Text style={styles.detailMetaValue}>
                {selectedIncident.occurredAt.toLocaleString()}
              </Text>
            </View>

            <Text style={styles.dismissHint}>Tap to dismiss</Text>
          </ScrollView>
        </TouchableOpacity>
      )}

      {/* No incidents message */}
      {!isLoading && incidents.size === 0 && (
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

// =============================================================================
// STYLES
// =============================================================================

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

  map: {
    flex: 1,
  },

  // User location marker
  userMarker: {
    width: USER_LOCATION.MARKER_SIZE,
    height: USER_LOCATION.MARKER_SIZE,
    borderRadius: USER_LOCATION.MARKER_SIZE / 2,
    backgroundColor: USER_LOCATION.MARKER_COLOR,
    borderWidth: USER_LOCATION.MARKER_BORDER_WIDTH,
    borderColor: USER_LOCATION.MARKER_BORDER_COLOR,
  },

  // Stats overlay
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

  // Details card
  detailsCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    maxHeight: 300,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  detailTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    marginRight: 12,
  },

  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  severityBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  detailDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },

  detailMeta: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  detailMetaLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
    width: 80,
  },

  detailMetaValue: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },

  dismissHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Empty state
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
