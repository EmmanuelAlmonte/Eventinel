import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Text } from '@rneui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showToast } from '@components/ui';
import { useReportDraft, useSharedLocation } from '@contexts';
import { useAppTheme } from '@hooks';
import { MAP_STYLES } from '@lib/map/types';
import { formatDistanceMiles } from '@lib/utils/locationDistance';
import { REPORT_RADIUS_METERS, getReportRadiusState } from '@lib/utils/reportLocationRadius';
import type { RootStackParamList, ReportLocation } from '@lib/navigation';

import { buildRadiusBounds, buildRadiusPolygon, getFeatureCoordinate } from './reportIncident/adjustMapGeometry';
import {
  buildLocationPresentation,
  useResolvedReportLocation,
} from './reportIncident/locationPresentation';

type ReportIncidentAdjustLocationScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ReportIncidentAdjustLocation'
>;

const MAP_LOGO_POSITION = { top: 16, left: 16 };
const MAP_ATTRIBUTION_POSITION = { top: 16, right: 16 };
const DEFAULT_FALLBACK_COORDINATE: [number, number] = [-75.1652, 39.9526];

export default function ReportIncidentAdjustLocationScreen({
  route,
  navigation,
}: ReportIncidentAdjustLocationScreenProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { location: sharedLocation, refresh } = useSharedLocation();
  const { draft, sessionKey, updateDraft, setAdjustEntryMode, resetDraft } = useReportDraft();
  const origin = route.params.origin;
  const currentDeviceLocation = useMemo(
    () =>
      sharedLocation
        ? {
            longitude: sharedLocation[0],
            latitude: sharedLocation[1],
          }
        : null,
    [sharedLocation]
  );
  const [candidateLocation, setCandidateLocation] = useState<ReportLocation | null>(draft.location);

  useEffect(() => {
    if (!candidateLocation && draft.location) {
      setCandidateLocation(draft.location);
    }
  }, [candidateLocation, draft.location]);
  const { resolvedPlaceLabel, resolvedContextLine, isResolvingPlace } = useResolvedReportLocation(candidateLocation, {
    debounceMs: 250,
  });

  const locationPresentation = useMemo(() => {
    if (!candidateLocation) {
      return {
        primary: 'Select report location',
        secondary: 'Tap the map to place the report pin. Your current location only sets the allowed local radius.',
        note: null,
        tertiary: null,
      };
    }

    return buildLocationPresentation({
      sourceTab: draft.sourceTab,
      location: candidateLocation,
      locationNote: draft.locationNote,
      resolvedPlaceLabel,
      resolvedContextLine,
      isResolvingPlace,
      missingLocationCopy: 'Current location is needed to keep reports local.',
    });
  }, [candidateLocation, draft.locationNote, draft.sourceTab, isResolvingPlace, resolvedContextLine, resolvedPlaceLabel]);
  const reportRadiusState = useMemo(
    () => getReportRadiusState(currentDeviceLocation, candidateLocation),
    [candidateLocation, currentDeviceLocation]
  );
  const anchorRing = useMemo(
    () => (currentDeviceLocation ? buildRadiusPolygon(currentDeviceLocation, REPORT_RADIUS_METERS) : null),
    [currentDeviceLocation]
  );
  const cameraBounds = useMemo(
    () => (currentDeviceLocation ? buildRadiusBounds(currentDeviceLocation, REPORT_RADIUS_METERS) : null),
    [currentDeviceLocation]
  );

  function handleMapPress(feature: GeoJSON.Feature<GeoJSON.Geometry>) {
    const nextLocation = getFeatureCoordinate(feature);
    if (nextLocation) {
      setCandidateLocation(nextLocation);
    }
  }

  function handleDrag(feature: GeoJSON.Feature<GeoJSON.Geometry>) {
    const nextLocation = getFeatureCoordinate(feature);
    if (nextLocation) {
      setCandidateLocation(nextLocation);
    }
  }

  function handleUseCurrentLocation() {
    if (!currentDeviceLocation) {
      return;
    }

    setCandidateLocation(currentDeviceLocation);
  }

  function handleSaveLocation() {
    if (!candidateLocation) {
      showToast.error('Location required', 'Move the report pin before saving.');
      return;
    }

    if (!reportRadiusState.isWithinRadius) {
      showToast.error('Report too far away', reportRadiusState.message);
      return;
    }

    updateDraft({ location: candidateLocation });
    setAdjustEntryMode(null);

    if (origin === 'initial_required' && sessionKey) {
      navigation.replace('ReportIncident', { sessionKey });
      return;
    }

    navigation.goBack();
  }

  async function handleRetryLocation() {
    await refresh();
  }

  const handleCancel = useCallback(() => {
    if (origin === 'initial_required') {
      resetDraft();
      navigation.popToTop();
      return;
    }

    setAdjustEntryMode(null);
    navigation.goBack();
  }, [navigation, origin, resetDraft, setAdjustEntryMode]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={handleCancel}
          style={{ paddingHorizontal: 16 }}
          hitSlop={{ top: 11, bottom: 11, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 22, color: colors.text }}>✕</Text>
        </Pressable>
      ),
    });
  }, [colors.text, handleCancel, navigation]);

  const canSaveLocation = Boolean(candidateLocation) && reportRadiusState.isWithinRadius;
  const distanceLabel =
    reportRadiusState.distanceMeters !== null
      ? `${formatDistanceMiles(reportRadiusState.distanceMeters)} from your current location`
      : 'Current distance unavailable';
  const mapCenterCoordinate = candidateLocation
    ? [candidateLocation.longitude, candidateLocation.latitude]
    : currentDeviceLocation
      ? [currentDeviceLocation.longitude, currentDeviceLocation.latitude]
      : DEFAULT_FALLBACK_COORDINATE;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
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
          onPress={handleMapPress}
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
            <Mapbox.Camera
              centerCoordinate={mapCenterCoordinate}
              zoomLevel={14}
              animationDuration={0}
            />
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
                onPress={handleUseCurrentLocation}
                style={({ pressed }) => [
                  styles.anchorMarkerPressable,
                  pressed && styles.anchorMarkerPressed,
                ]}
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
              onDrag={handleDrag}
              onDragEnd={handleDrag}
            >
              <View style={[styles.reportPin, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                <MaterialCommunityIcons name="map-marker" size={18} color="#FFFFFF" />
              </View>
            </Mapbox.PointAnnotation>
          ) : null}
        </Mapbox.MapView>
      </View>

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <Text style={[styles.sheetTitle, { color: colors.text }]}>{locationPresentation.primary}</Text>
        <Text style={[styles.sheetBody, { color: colors.textMuted }]}>{locationPresentation.secondary}</Text>
        {locationPresentation.note ? (
          <Text style={[styles.sheetDetail, { color: colors.textMuted }]}>Detail: {locationPresentation.note}</Text>
        ) : null}
        {locationPresentation.tertiary ? (
          <Text style={[styles.sheetMeta, { color: colors.textMuted }]}>{locationPresentation.tertiary}</Text>
        ) : null}

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Current location</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Report pin</Text>
          </View>
        </View>

        <Text style={[styles.distanceText, { color: colors.textMuted }]}>{distanceLabel}</Text>
        <Text
          style={[
            styles.statusText,
            { color: reportRadiusState.isWithinRadius ? colors.success : colors.warning },
          ]}
        >
          {reportRadiusState.message}
        </Text>

        {!currentDeviceLocation ? (
          <Text style={[styles.blockedText, { color: colors.textMuted }]}>
            Current location is needed to keep reports local. Turn on location access or retry.
          </Text>
        ) : null}

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel location adjustment"
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
          </Pressable>

          {currentDeviceLocation ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save adjusted location"
              onPress={handleSaveLocation}
              disabled={!canSaveLocation}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: canSaveLocation ? colors.primary : colors.background,
                  borderColor: canSaveLocation ? colors.primary : colors.border,
                },
                pressed && canSaveLocation && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.primaryButtonText, { color: canSaveLocation ? '#FFFFFF' : colors.textMuted }]}>
                Save location
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry current location"
              onPress={handleRetryLocation}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Retry location</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
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
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  sheetDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
  sheetMeta: {
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.72,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    lineHeight: 18,
  },
  distanceText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  blockedText: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
