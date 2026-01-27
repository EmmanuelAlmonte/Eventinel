/**
 * Map Screen
 *
 * Displays a Mapbox map with real-time incident markers from Nostr kind:30911 events.
 * Uses extracted hooks for location and subscription logic.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox, { type MapState } from '@rnmapbox/maps';
import { Icon } from '@rneui/themed';

import { MapSkeleton } from '@components/ui';
import { useSharedLocation, useSharedIncidents } from '@contexts';
import { IncidentMarker } from '@components/map';
import { DEFAULT_CAMERA, MAP_STYLES } from '@lib/map/types';
import { MAPBOX_CONFIG, USER_LOCATION, INCIDENT_LIMITS } from '@lib/map/constants';
import type { ParsedIncident } from '@lib/nostr/events/types';

// Camera animation modes
type CameraAnimationMode = 'flyTo' | 'easeTo' | 'linearTo' | 'moveTo' | 'none';
const FLY_TO_DURATION = 1500; // ms
const AUTO_RESUME_DELAY_MS = 20000;

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

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

  // Get shared user location (fetched once in LocationProvider)
  const { location: userLocation, isLoading: isLoadingLocation, source: locationSource, permission } = useSharedLocation();

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
  } = useSharedIncidents();

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
  const cameraCenterCoordinate = followUser ? effectiveCameraCenter : undefined;

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
          <Text style={styles.statsText}>Incidents: {incidents.length}</Text>
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
      {!isLoadingLocation && hasReceivedHistory && incidents.length === 0 && (
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
