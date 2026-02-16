/**
 * MapScreen
 *
 * Displays incident markers on Mapbox with shared subscription state.
 */

import { useCallback, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text } from '@rneui/themed';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationRequiredEmpty, MapSkeleton, ScreenContainer } from '@components/ui';
import { useRelayStatus, useSharedIncidents, useSharedLocation } from '@contexts';
import { useAppTheme, type ProcessedIncident } from '@hooks';
import { MAPBOX_CONFIG } from '@lib/map/constants';
import { incidentsToFeatureCollection, MAP_STYLES, DEFAULT_CAMERA } from '@lib/map/types';

import {
  CLUSTER_COUNT_LAYER_ID,
  CLUSTER_LAYER_ID,
  CLUSTER_RADIUS,
  INCIDENT_LABEL_LAYER_ID,
  INCIDENT_LAYER_ID,
  INCIDENT_SOURCE_ID,
  Mapbox,
  clusterFilter,
  incidentCircleStyle,
  incidentLabelStyle,
  pointFilter,
  type ShapeSourcePressEvent,
} from './map/config';
import { buildRelayBannerStatus, formatRelayList } from './map/helpers';
import { MapOverlays } from './map/MapOverlays';
import { mapLayerStyles, mapScreenStyles as styles } from './map/styles';
import { useMapCamera } from './map/useMapCamera';
import { useMapViewportSubscription } from './map/useMapViewportSubscription';

const EMPTY_INCIDENTS: ProcessedIncident[] = [];

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { hasConnectedRelay, hasRelays, isConnecting, relays } = useRelayStatus();
  const {
    location: userLocation,
    isLoading: isLoadingLocation,
    source: locationSource,
    permission,
    refresh: refreshLocation,
  } = useSharedLocation();
  const {
    incidents,
    hasReceivedHistory,
    setMapFocused,
    setMapSubscriptionAnchor,
    setMapSubscriptionViewport,
  } = useSharedIncidents();

  const camera = useMapCamera({ userLocation });
  const viewport = useMapViewportSubscription({
    isFocused,
    lastCameraZoomRef: camera.lastCameraZoomRef,
    setMapFocused,
    setMapSubscriptionAnchor,
    setMapSubscriptionViewport,
  });

  const visibleIncidents = isFocused ? incidents : EMPTY_INCIDENTS;
  const incidentFeatureCollection = useMemo(
    () => incidentsToFeatureCollection(visibleIncidents),
    [visibleIncidents]
  );

  const handleIncidentPress = useCallback(
    (incidentId: string) => {
      navigation.navigate('IncidentDetail', { incidentId });
    },
    [navigation]
  );

  const handleRelaySettings = useCallback(() => {
    navigation.navigate('Relays');
  }, [navigation]);

  const relayLabel = formatRelayList(relays.map((relay) => relay.url));
  const relayStatus = buildRelayBannerStatus({
    hasConnectedRelay,
    hasRelays,
    isConnecting,
    relayLabel,
  });

  const handleShapeSourcePress = useCallback(
    (event: ShapeSourcePressEvent) => {
      const feature = event?.features?.[0];
      if (!feature || !feature.properties) {
        return;
      }

      const properties = feature.properties as Record<string, unknown>;
      if (properties.cluster) {
        if (!feature.geometry || feature.geometry.type !== 'Point') return;

        const coordinates = feature.geometry.coordinates as [number, number];
        camera.clearAutoResumeTimer();
        camera.setFollowUser(false);

        void (async () => {
          const zoom = await camera.shapeSourceRef.current?.getClusterExpansionZoom(feature);
          if (zoom == null) return;

          camera.cameraRef.current?.setCamera({
            centerCoordinate: coordinates,
            zoomLevel: zoom,
            animationDuration: 400,
            animationMode: 'easeTo',
          });
          camera.scheduleAutoResume();
        })();
        return;
      }

      const incidentId = properties.incidentId;
      if (typeof incidentId === 'string' && incidentId.length > 0) {
        handleIncidentPress(incidentId);
      }
    },
    [camera, handleIncidentPress]
  );

  if (isLoadingLocation) {
    return <MapSkeleton />;
  }

  if (!userLocation) {
    return (
      <ScreenContainer>
        <LocationRequiredEmpty permission={permission} onRetry={() => void refreshLocation()} />
      </ScreenContainer>
    );
  }

  if (!Mapbox) {
    return (
      <ScreenContainer centerContent>
        <Text style={styles.mapUnavailableTitle}>Map unavailable in this build</Text>
        <Text style={styles.mapUnavailableSubtitle}>
          Reload using the custom dev client build that includes Mapbox native modules.
        </Text>
      </ScreenContainer>
    );
  }

  const effectiveCameraCenter = camera.cameraCenter || userLocation || DEFAULT_CAMERA.centerCoordinate;
  const cameraCenterCoordinate = camera.followUser ? effectiveCameraCenter : undefined;

  return (
    <View style={styles.container}>
      <View
        style={styles.mapContainer}
        onLayout={(event) => {
          if (event.nativeEvent.layout.width > 0 && !camera.mapReady) {
            camera.setMapReady(true);
          }
        }}
      >
        {camera.mapReady ? (
          <Mapbox.MapView
            style={styles.map}
            styleURL={MAP_STYLES.DARK}
            onCameraChanged={camera.handleCameraChanged}
            onMapIdle={viewport.handleMapIdle}
          >
            <Mapbox.Camera
              ref={camera.cameraRef}
              zoomLevel={MAPBOX_CONFIG.DEFAULT_ZOOM}
              centerCoordinate={cameraCenterCoordinate}
              animationMode={camera.animationMode !== 'none' ? camera.animationMode : undefined}
              animationDuration={camera.animationDuration}
            />

            {userLocation ? (
              <Mapbox.PointAnnotation id="user-location" coordinate={userLocation}>
                <View style={styles.userMarker} />
              </Mapbox.PointAnnotation>
            ) : null}

            <Mapbox.ShapeSource
              id={INCIDENT_SOURCE_ID}
              ref={camera.shapeSourceRef}
              shape={incidentFeatureCollection}
              cluster
              clusterRadius={CLUSTER_RADIUS}
              hitbox={{ width: 44, height: 44 }}
              onPress={handleShapeSourcePress}
            >
              <Mapbox.CircleLayer
                id={CLUSTER_LAYER_ID}
                filter={clusterFilter}
                style={mapLayerStyles.clusterCircleStyle}
              />
              <Mapbox.SymbolLayer
                id={CLUSTER_COUNT_LAYER_ID}
                filter={clusterFilter}
                style={mapLayerStyles.clusterCountStyle}
              />
              <Mapbox.CircleLayer id={INCIDENT_LAYER_ID} filter={pointFilter} style={incidentCircleStyle} />
              <Mapbox.SymbolLayer id={INCIDENT_LABEL_LAYER_ID} filter={pointFilter} style={incidentLabelStyle} />
            </Mapbox.ShapeSource>
          </Mapbox.MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}
      </View>

      <MapOverlays
        colors={colors}
        insets={insets}
        relayStatus={relayStatus}
        onRelaySettings={handleRelaySettings}
        userLocation={userLocation}
        isAnimating={camera.isAnimating}
        onFlyToUser={camera.handleFlyToUser}
        visibleIncidents={visibleIncidents}
        hasReceivedHistory={hasReceivedHistory}
        isLoadingLocation={isLoadingLocation}
        isFocused={isFocused}
        isViewportCoveredBySubscriptionGrid={viewport.isViewportCoveredBySubscriptionGrid}
        locationSource={locationSource}
        permission={permission}
      />
    </View>
  );
}
