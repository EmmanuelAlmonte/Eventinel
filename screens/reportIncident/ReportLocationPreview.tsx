import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@hooks';
import { MAP_STYLES } from '@lib/map/types';
import type { ReportLocation } from '@lib/navigation';

import type { LocationPresentation } from './locationPresentation';

const MAP_PREVIEW_ZOOM = 17.1;
const MAP_PREVIEW_FALLBACK_TIMEOUT_MS = 1800;
const MAP_PREVIEW_LOGO_POSITION = { bottom: 8, left: 8 };
const MAP_PREVIEW_ATTRIBUTION_POSITION = { bottom: 8, right: 8 };

type ReportLocationPreviewProps = {
  colors: ReturnType<typeof useAppTheme>['colors'];
  location: ReportLocation | null;
  presentation: LocationPresentation;
  mapHeight?: number;
};

export function ReportLocationPreview({
  colors,
  location,
  presentation,
  mapHeight = 116,
}: ReportLocationPreviewProps) {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const markerCoordinate = useMemo<[number, number] | null>(
    () => (location ? [location.longitude, location.latitude] : null),
    [location]
  );

  useEffect(() => {
    if (!location) {
      return undefined;
    }

    const fallbackTimer = setTimeout(() => {
      setShowFallback((current) => (isMapVisible ? current : true));
    }, MAP_PREVIEW_FALLBACK_TIMEOUT_MS);

    return () => clearTimeout(fallbackTimer);
  }, [isMapVisible, location]);

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {markerCoordinate ? (
        <View style={[styles.mapShell, { height: mapHeight }]}>
          <Mapbox.MapView
            style={styles.map}
            styleURL={MAP_STYLES.DARK}
            projection="mercator"
            surfaceView={false}
            scrollEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            zoomEnabled={false}
            logoEnabled
            logoPosition={MAP_PREVIEW_LOGO_POSITION}
            attributionEnabled
            attributionPosition={MAP_PREVIEW_ATTRIBUTION_POSITION}
            compassEnabled={false}
            scaleBarEnabled={false}
            onDidFinishLoadingMap={() => {
              setIsMapVisible(true);
              setShowFallback(false);
            }}
            onMapIdle={() => {
              setIsMapVisible(true);
              setShowFallback(false);
            }}
          >
            <Mapbox.Camera
              zoomLevel={MAP_PREVIEW_ZOOM}
              centerCoordinate={markerCoordinate}
              animationDuration={0}
            />
            <Mapbox.MarkerView coordinate={markerCoordinate}>
              <View style={[styles.previewMarker, { backgroundColor: colors.primary }]} />
            </Mapbox.MarkerView>
          </Mapbox.MapView>

          {showFallback && !isMapVisible ? (
            <View style={styles.mapFallback}>
              <Text style={styles.mapFallbackText}>Map loading</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.content}>
        <View style={[styles.iconBadge, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.text }]}>{presentation.primary}</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>{presentation.secondary}</Text>
          {presentation.note ? (
            <Text style={[styles.detail, { color: colors.textMuted }]}>Detail: {presentation.note}</Text>
          ) : null}
          {presentation.tertiary ? (
            <Text style={[styles.meta, { color: colors.textMuted }]}>{presentation.tertiary}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapShell: {
    backgroundColor: '#0F172A',
  },
  map: {
    flex: 1,
  },
  mapFallback: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 16, 28, 0.18)',
  },
  mapFallbackText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '600',
  },
  previewMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#0F172A',
  },
  content: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  detail: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  meta: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
    opacity: 0.72,
  },
});
