import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text as RNText, View } from 'react-native';
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
  spinnerColor: string;
};

export function IncidentDetailMiniMap({
  location,
  markerColor,
  markerGlyph,
  spinnerColor,
}: IncidentDetailMiniMapProps) {
  const [mapReady, setMapReady] = useState(false);

  return (
    <View
      style={styles.mapContainer}
      onLayout={(event) => {
        if (event.nativeEvent.layout.width > 0 && !mapReady) {
          setMapReady(true);
        }
      }}
    >
      {mapReady ? (
        <Mapbox.MapView
          style={styles.miniMap}
          styleURL={MAP_STYLES.DARK}
          scrollEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          zoomEnabled={false}
          maxPitch={65}
        >
          <Mapbox.Camera
            zoomLevel={MINI_MAP_ZOOM}
            centerCoordinate={[location.lng, location.lat]}
            pitch={MINI_MAP_PITCH}
            heading={MINI_MAP_HEADING}
            animationDuration={0}
          />
          <Mapbox.MarkerView coordinate={[location.lng, location.lat]}>
            <View style={[styles.mapMarker, { backgroundColor: markerColor }]}>
              <RNText style={styles.mapMarkerGlyph}>{markerGlyph}</RNText>
            </View>
          </Mapbox.MarkerView>
        </Mapbox.MapView>
      ) : (
        <View style={[styles.miniMap, styles.mapPlaceholder]}>
          <ActivityIndicator size="small" color={spinnerColor} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 180,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  miniMap: {
    flex: 1,
  },
  mapPlaceholder: {
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
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
