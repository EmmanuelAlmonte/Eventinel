import { Pressable, StyleSheet, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { MAP_STYLES } from '@lib/map/types';
import type { ReportLocation } from '@lib/navigation';

import type { ReportFormColors } from './reportFormTypes';

const MAP_LOGO_POSITION = { top: 16, left: 16 };
const MAP_ATTRIBUTION_POSITION = { top: 16, right: 16 };

type RadiusBounds = {
  ne: [number, number];
  sw: [number, number];
};

type ReportAdjustLocationMapProps = {
  colors: ReportFormColors;
  anchorRing: GeoJSON.Feature<GeoJSON.Polygon> | null;
  cameraBounds: RadiusBounds | null;
  currentDeviceLocation: ReportLocation | null;
  candidateLocation: ReportLocation | null;
  mapCenterCoordinate: [number, number];
  onMapPress: (feature: GeoJSON.Feature<GeoJSON.Geometry>) => void;
  onPinDrag: (feature: GeoJSON.Feature<GeoJSON.Geometry>) => void;
  onUseCurrentLocation: () => void;
};

export function ReportAdjustLocationMap({
  colors,
  anchorRing,
  cameraBounds,
  currentDeviceLocation,
  candidateLocation,
  mapCenterCoordinate,
  onMapPress,
  onPinDrag,
  onUseCurrentLocation,
}: ReportAdjustLocationMapProps) {
  return (
    <View style={styles.mapContainer}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={MAP_STYLES.DARK}
        projection="mercator"
        surfaceView={false}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        logoEnabled
        logoPosition={MAP_LOGO_POSITION}
        attributionEnabled
        attributionPosition={MAP_ATTRIBUTION_POSITION}
        compassEnabled={false}
        scaleBarEnabled={false}
        onPress={onMapPress}
      >
        {cameraBounds ? (
          <Mapbox.Camera
            bounds={cameraBounds}
            padding={{
              paddingTop: 36,
              paddingLeft: 36,
              paddingRight: 36,
              paddingBottom: 36,
            }}
            animationDuration={0}
          />
        ) : (
          <Mapbox.Camera centerCoordinate={mapCenterCoordinate} zoomLevel={14} animationDuration={0} />
        )}

        {anchorRing ? (
          <Mapbox.ShapeSource id="report-radius-ring-source" shape={anchorRing}>
            <Mapbox.FillLayer
              id="report-radius-ring-fill"
              style={{
                fillColor: colors.primary,
                fillOpacity: 0.09,
              }}
            />
            <Mapbox.LineLayer
              id="report-radius-ring-line"
              style={{
                lineColor: colors.primary,
                lineOpacity: 0.5,
                lineWidth: 2,
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}

        {currentDeviceLocation ? (
          <Mapbox.MarkerView coordinate={[currentDeviceLocation.longitude, currentDeviceLocation.latitude]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use current location for report"
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              onPress={onUseCurrentLocation}
              style={({ pressed }) => [styles.anchorMarkerPressable, pressed && styles.anchorMarkerPressed]}
            >
              <View style={[styles.anchorMarkerOuter, { borderColor: colors.border }]}>
                <View style={[styles.anchorMarkerInner, { backgroundColor: colors.textMuted }]} />
              </View>
            </Pressable>
          </Mapbox.MarkerView>
        ) : null}

        {candidateLocation ? (
          <Mapbox.PointAnnotation
            id="report-edit-pin"
            coordinate={[candidateLocation.longitude, candidateLocation.latitude]}
            draggable
            onDrag={onPinDrag}
            onDragEnd={onPinDrag}
          >
            <View style={[styles.reportPin, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <MaterialCommunityIcons name="map-marker" size={18} color="#FFFFFF" />
            </View>
          </Mapbox.PointAnnotation>
        ) : null}
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  anchorMarkerOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  anchorMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  anchorMarkerPressable: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anchorMarkerPressed: {
    opacity: 0.9,
  },
  reportPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
