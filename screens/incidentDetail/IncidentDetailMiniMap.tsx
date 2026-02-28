import { useCallback, useMemo, useRef, useState } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import { MAP_STYLES } from '@lib/map/types';

const MINI_MAP_PITCH = 55;
const MINI_MAP_HEADING = 20;
const MINI_MAP_ZOOM = 15;
const DEBUG_MINI_MAP_FLASH =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_MINIMAP_FLASH === '1';

type MiniMapReadyStage = 'style' | 'map' | 'render';

type IncidentDetailMiniMapProps = {
  location: {
    lat: number;
    lng: number;
  };
  markerColor: string;
  markerIconSource: ImageSourcePropType;
  markerIconTintColor: string;
};

export function IncidentDetailMiniMap({
  location,
  markerColor,
  markerIconSource,
  markerIconTintColor,
}: IncidentDetailMiniMapProps) {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const mountStartedAtRef = useRef(Date.now());
  const markerCoordinate = useMemo<[number, number]>(
    () => [location.lng, location.lat],
    [location.lng, location.lat]
  );
  const logReadyStage = useCallback((stage: MiniMapReadyStage) => {
    if (!DEBUG_MINI_MAP_FLASH) return;
    const elapsedMs = Date.now() - mountStartedAtRef.current;
    console.log(`[MiniMap] ${stage} +${elapsedMs}ms`);
  }, []);

  const handleStyleLoaded = useCallback(() => {
    logReadyStage('style');
  }, [logReadyStage]);

  const handleMapLoaded = useCallback(() => {
    logReadyStage('map');
  }, [logReadyStage]);

  const handleMapRenderedFully = useCallback(() => {
    logReadyStage('render');
    setIsMapVisible(true);
  }, [logReadyStage]);

  return (
    <View style={styles.mapContainer}>
      <View style={[styles.miniMap, styles.mapPlaceholder]}>
        <View style={[styles.mapMarker, { backgroundColor: markerColor }]}>
          <Image
            source={markerIconSource}
            style={[styles.mapMarkerIcon, { tintColor: markerIconTintColor }]}
            resizeMode="contain"
          />
        </View>
      </View>

      <Mapbox.MapView
        style={[styles.miniMap, !isMapVisible && styles.mapHiddenUntilReady]}
        styleURL={MAP_STYLES.DARK}
        projection="mercator"
        surfaceView={false}
        scrollEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        zoomEnabled={false}
        maxPitch={65}
        onDidFinishLoadingStyle={handleStyleLoaded}
        onDidFinishLoadingMap={handleMapLoaded}
        onDidFinishRenderingMapFully={handleMapRenderedFully}
      >
        <Mapbox.Camera
          zoomLevel={MINI_MAP_ZOOM}
          centerCoordinate={markerCoordinate}
          pitch={MINI_MAP_PITCH}
          heading={MINI_MAP_HEADING}
          animationDuration={0}
        />
        <Mapbox.MarkerView coordinate={markerCoordinate}>
          <View style={[styles.mapMarker, { backgroundColor: markerColor }]}>
            <Image
              source={markerIconSource}
              style={[styles.mapMarkerIcon, { tintColor: markerIconTintColor }]}
              resizeMode="contain"
            />
          </View>
        </Mapbox.MarkerView>
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 180,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0B1220',
  },
  miniMap: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHiddenUntilReady: {
    opacity: 0,
  },
  mapMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0F172A',
  },
  mapMarkerIcon: {
    width: 22,
    height: 22,
  },
});
