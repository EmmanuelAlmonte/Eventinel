import { useMemo, useState } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import { MAP_STYLES } from '@lib/map/types';

const MINI_MAP_PITCH = 55;
const MINI_MAP_HEADING = 20;
const MINI_MAP_ZOOM = 15;

type IncidentDetailMiniMapProps = {
  location: {
    lat: number;
    lng: number;
  };
  markerColor: string;
  markerGlyph: string;
};

export function IncidentDetailMiniMap({
  location,
  markerColor,
  markerGlyph,
}: IncidentDetailMiniMapProps) {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const markerCoordinate = useMemo<[number, number]>(
    () => [location.lng, location.lat],
    [location.lng, location.lat]
  );

  return (
    <View style={styles.mapContainer}>
      <View style={[styles.miniMap, styles.mapPlaceholder]}>
        <View style={[styles.mapMarker, { backgroundColor: markerColor }]}>
          <RNText style={styles.mapMarkerGlyph}>{markerGlyph}</RNText>
        </View>
      </View>

      <Mapbox.MapView
        style={[styles.miniMap, !isMapVisible && styles.mapHiddenUntilReady]}
        styleURL={MAP_STYLES.DARK}
        scrollEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        zoomEnabled={false}
        maxPitch={65}
        onDidFinishLoadingStyle={() => setIsMapVisible(true)}
        onDidFinishLoadingMap={() => setIsMapVisible(true)}
        onDidFinishRenderingMapFully={() => setIsMapVisible(true)}
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
            <RNText style={styles.mapMarkerGlyph}>{markerGlyph}</RNText>
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
  mapMarkerGlyph: {
    fontSize: 14,
    textAlign: 'center',
  },
});
