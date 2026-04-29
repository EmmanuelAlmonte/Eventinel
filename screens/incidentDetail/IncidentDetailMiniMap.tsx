import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Icon, Text } from '@rneui/themed';

import { MAP_STYLES } from '@lib/map/types';

const MINI_MAP_HEADING = 35;
const MINI_MAP_ZOOM = 16.9;
const MINI_MAP_MAX_ZOOM = 22;
const MINI_MAP_FALLBACK_TIMEOUT_MS = 1800;
const MINI_MAP_ROTATION_STEP = 1.25;
const MINI_MAP_ROTATION_INTERVAL_MS = 120;
const MINI_MAP_ROTATION_ANIMATION_MS = 180;
const DEBUG_MINI_MAP_FLASH = __DEV__ && process.env.EXPO_PUBLIC_DEBUG_MINIMAP_FLASH === '1';
const MINI_MAP_3D_PITCH = 45;
const MINI_MAP_3D_BUILDINGS_STYLE = {
  fillExtrusionColor: '#94A3B8',
  fillExtrusionOpacity: 0.7,
  fillExtrusionHeight: ['coalesce', ['get', 'height'], 0],
  fillExtrusionBase: ['coalesce', ['get', 'min_height'], 0],
  fillExtrusionVerticalGradient: true,
} as const;

type MiniMapReadyStage = 'style' | 'load' | 'idle' | 'render' | 'error';

type IncidentDetailMiniMapProps = {
  location: {
    lat: number;
    lng: number;
  };
  markerColor: string;
  markerIconSource: ImageSourcePropType;
  markerIconTintColor: string;
  isExpanded?: boolean;
  onExpand?: (isExpanded: boolean) => void;
  hero?: boolean;
};

export function IncidentDetailMiniMap({
  location,
  markerColor,
  markerIconSource,
  markerIconTintColor,
  isExpanded = false,
  onExpand,
  hero = false,
}: IncidentDetailMiniMapProps) {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const currentHeadingRef = useRef(MINI_MAP_HEADING);
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
  const markMapVisible = useCallback(
    (stage: Exclude<MiniMapReadyStage, 'style' | 'error'>) => {
      logReadyStage(stage);
      setIsMapVisible(true);
      setShowFallback(false);
    },
    [logReadyStage]
  );

  const handleStyleLoaded = useCallback(() => {
    logReadyStage('style');
  }, [logReadyStage]);

  const handleMapLoaded = useCallback(() => {
    // The local RN Mapbox docs define this as the successful map/style load event.
    markMapVisible('load');
  }, [markMapVisible]);

  const handleMapIdle = useCallback(() => {
    markMapVisible('idle');
  }, [markMapVisible]);

  const handleMapRenderedFully = useCallback(() => {
    markMapVisible('render');
  }, [markMapVisible]);

  const handleMapLoadingError = useCallback(() => {
    logReadyStage('error');
  }, [logReadyStage]);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setShowFallback((current) => (isMapVisible ? current : true));
    }, MINI_MAP_FALLBACK_TIMEOUT_MS);

    return () => clearTimeout(fallbackTimer);
  }, [isMapVisible]);

  useEffect(() => {
    if (!isMapVisible || isExpanded) {
      return;
    }

    const rotationTimer = setInterval(() => {
      const nextHeading = (currentHeadingRef.current + MINI_MAP_ROTATION_STEP) % 360;
      currentHeadingRef.current = nextHeading;
      cameraRef.current?.setCamera({
        heading: nextHeading,
        animationMode: 'linearTo',
        animationDuration: MINI_MAP_ROTATION_ANIMATION_MS,
      });
    }, MINI_MAP_ROTATION_INTERVAL_MS);

    return () => clearInterval(rotationTimer);
  }, [isExpanded, isMapVisible]);

  const handleCollapseMap = useCallback(() => {
    onExpand?.(false);
  }, [onExpand]);

  return (
    <>
      <View style={[styles.mapContainer, hero ? styles.heroMapContainer : null]}>
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
          onMapIdle={handleMapIdle}
          onDidFinishRenderingMapFully={handleMapRenderedFully}
          onMapLoadingError={handleMapLoadingError}
        >
          <Mapbox.Camera
            ref={cameraRef}
            zoomLevel={MINI_MAP_ZOOM}
            centerCoordinate={markerCoordinate}
            pitch={MINI_MAP_3D_PITCH}
            heading={MINI_MAP_HEADING}
            animationDuration={0}
          />
          <Mapbox.FillExtrusionLayer
            id="incident-detail-3d-buildings"
            sourceID="composite"
            sourceLayerID="building"
            minZoomLevel={14}
            maxZoomLevel={MINI_MAP_MAX_ZOOM}
            style={MINI_MAP_3D_BUILDINGS_STYLE}
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

        {showFallback && !isMapVisible ? (
          <View style={styles.mapFallback}>
            <View style={styles.fallbackChip}>
              <Text style={styles.fallbackStatus}>Map loading</Text>
            </View>
          </View>
        ) : null}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={handleCollapseMap}
        presentationStyle="fullScreen"
        visible={isExpanded}
      >
        <View style={styles.expandedModal}>
          <Mapbox.MapView
            style={styles.expandedMap}
            styleURL={MAP_STYLES.DARK}
            projection="mercator"
            surfaceView={false}
            scrollEnabled
            pitchEnabled={false}
            rotateEnabled
            zoomEnabled
            maxPitch={65}
          >
            <Mapbox.Camera
              zoomLevel={MINI_MAP_ZOOM}
              centerCoordinate={markerCoordinate}
              pitch={MINI_MAP_3D_PITCH}
              heading={currentHeadingRef.current}
              animationDuration={0}
            />
            <Mapbox.FillExtrusionLayer
              id="incident-detail-3d-buildings-expanded"
              sourceID="composite"
              sourceLayerID="building"
              minZoomLevel={14}
              maxZoomLevel={MINI_MAP_MAX_ZOOM}
              style={MINI_MAP_3D_BUILDINGS_STYLE}
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Collapse map"
            onPress={handleCollapseMap}
            style={styles.collapseButton}
          >
            <Icon name="close-fullscreen" type="material" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    minHeight: 260,
    overflow: 'hidden',
    backgroundColor: '#0B1220',
  },
  heroMapContainer: {
    height: '100%',
    minHeight: 0,
    borderRadius: 0,
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
  mapFallback: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 16, 28, 0.18)',
  },
  fallbackChip: {
    backgroundColor: 'rgba(7, 12, 21, 0.76)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fallbackStatus: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '600',
  },
  expandedModal: {
    flex: 1,
    backgroundColor: '#050B14',
  },
  expandedMap: {
    flex: 1,
  },
  collapseButton: {
    position: 'absolute',
    top: 24,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 12, 21, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
});
