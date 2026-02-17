/**
 * MapScreenCanvas
 *
 * Renders the map viewport, layers, and overlay composition container.
 */

import type { LayoutChangeEvent } from 'react-native';
import { ActivityIndicator, View } from 'react-native';
import { DEFAULT_CAMERA, incidentsToFeatureCollection, MAP_STYLES } from '@lib/map/types';
import { MAPBOX_CONFIG } from '@lib/map/constants';
import { type EdgeInsets } from 'react-native-safe-area-context';

import {
  CLUSTER_COUNT_LAYER_ID,
  CLUSTER_LAYER_ID,
  CLUSTER_RADIUS,
  INCIDENT_LABEL_LAYER_ID,
  INCIDENT_LAYER_ID,
  INCIDENT_SOURCE_ID,
  incidentCircleStyle,
  incidentLabelStyle,
  type ShapeSourcePressEvent,
  type MapboxModule,
  clusterFilter,
  pointFilter,
} from './config';
import { type MapScreenCamera, type MapScreenViewport, type LocationPermissionStatus } from './useMapScreenState';
import { type RelayBannerStatus } from './helpers';
import { mapLayerStyles, mapScreenStyles as styles } from './styles';
import type { ProcessedIncident } from '@hooks';
import { MapOverlays } from './MapOverlays';

const MAP_PLACEHOLDER_COLOR = '#2563eb';

type MapScreenLayoutProps = {
  mapbox: MapboxModule;
  camera: MapScreenCamera;
  viewport: MapScreenViewport;
  colors: {
    border: string;
    primary: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  insets: EdgeInsets;
  relayStatus: RelayBannerStatus;
  userLocation: [number, number] | null;
  incidentFeatureCollection: ReturnType<typeof incidentsToFeatureCollection>;
  hasReceivedHistory: boolean;
  visibleIncidents: ProcessedIncident[];
  isLoadingLocation: boolean;
  isFocused: boolean;
  isViewportCoveredBySubscriptionGrid: boolean;
  locationSource: string | null;
  permission: LocationPermissionStatus;
  handleMapLayout: (event: LayoutChangeEvent) => void;
  handleRelaySettings: () => void;
  onShapeSourcePress: (event: ShapeSourcePressEvent) => void | Promise<void>;
  onFlyToUser: () => void;
};

function MapPlaceholder() {
  return (
    <View style={styles.mapPlaceholder}>
      <ActivityIndicator size="large" color={MAP_PLACEHOLDER_COLOR} />
    </View>
  );
}

export function MapScreenCanvas({
  mapbox,
  camera,
  viewport,
  colors,
  insets,
  relayStatus,
  userLocation,
  incidentFeatureCollection,
  hasReceivedHistory,
  visibleIncidents,
  isLoadingLocation,
  isFocused,
  isViewportCoveredBySubscriptionGrid,
  locationSource,
  permission,
  handleMapLayout,
  handleRelaySettings,
  onShapeSourcePress,
  onFlyToUser,
}: MapScreenLayoutProps) {
  const effectiveCameraCenter = camera.cameraCenter || userLocation || DEFAULT_CAMERA.centerCoordinate;
  const cameraCenterCoordinate = camera.followUser ? effectiveCameraCenter : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer} onLayout={handleMapLayout}>
        {camera.mapReady ? (
          <mapbox.MapView
            style={styles.map}
            styleURL={MAP_STYLES.DARK}
            onCameraChanged={camera.handleCameraChanged}
            onMapIdle={viewport.handleMapIdle}
          >
            <mapbox.Camera
              ref={camera.cameraRef}
              zoomLevel={MAPBOX_CONFIG.DEFAULT_ZOOM}
              centerCoordinate={cameraCenterCoordinate}
              animationMode={camera.animationMode !== 'none' ? camera.animationMode : undefined}
              animationDuration={camera.animationDuration}
            />

            {userLocation ? (
              <mapbox.PointAnnotation id="user-location" coordinate={userLocation}>
                <View style={styles.userMarker} />
              </mapbox.PointAnnotation>
            ) : null}

            <mapbox.ShapeSource
              id={INCIDENT_SOURCE_ID}
              ref={camera.shapeSourceRef}
              shape={incidentFeatureCollection}
              cluster
              clusterRadius={CLUSTER_RADIUS}
              hitbox={{ width: 44, height: 44 }}
              onPress={onShapeSourcePress}
            >
              <mapbox.CircleLayer
                id={CLUSTER_LAYER_ID}
                filter={clusterFilter}
                style={mapLayerStyles.clusterCircleStyle}
              />
              <mapbox.SymbolLayer
                id={CLUSTER_COUNT_LAYER_ID}
                filter={clusterFilter}
                style={mapLayerStyles.clusterCountStyle}
              />
              <mapbox.CircleLayer
                id={INCIDENT_LAYER_ID}
                filter={pointFilter}
                style={incidentCircleStyle}
              />
              <mapbox.SymbolLayer
                id={INCIDENT_LABEL_LAYER_ID}
                filter={pointFilter}
                style={incidentLabelStyle}
              />
            </mapbox.ShapeSource>
          </mapbox.MapView>
        ) : (
          <MapPlaceholder />
        )}
      </View>

      <MapOverlays
        colors={colors}
        insets={insets}
        relayStatus={relayStatus}
        onRelaySettings={handleRelaySettings}
        userLocation={userLocation}
        isAnimating={camera.isAnimating}
        onFlyToUser={onFlyToUser}
        visibleIncidents={visibleIncidents}
        hasReceivedHistory={hasReceivedHistory}
        isLoadingLocation={isLoadingLocation}
        isFocused={isFocused}
        isViewportCoveredBySubscriptionGrid={isViewportCoveredBySubscriptionGrid}
        locationSource={locationSource}
        permission={permission}
      />
    </View>
  );
}
