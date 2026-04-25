import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showToast } from '@components/ui';
import { useReportDraft, useSharedLocation } from '@contexts';
import { useAppTheme } from '@hooks';
import { formatDistanceMiles } from '@lib/utils/locationDistance';
import { REPORT_RADIUS_METERS, getReportRadiusState } from '@lib/utils/reportLocationRadius';
import type { RootStackParamList, ReportLocation } from '@lib/navigation';

import { buildRadiusBounds, buildRadiusPolygon, getFeatureCoordinate } from './reportIncident/adjustMapGeometry';
import { ReportAdjustLocationMap } from './reportIncident/ReportAdjustLocationMap';
import { ReportAdjustLocationSheet } from './reportIncident/ReportAdjustLocationSheet';
import {
  buildLocationPresentation,
  useResolvedReportLocation,
} from './reportIncident/locationPresentation';

type ReportIncidentAdjustLocationScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ReportIncidentAdjustLocation'
>;

const DEFAULT_FALLBACK_COORDINATE: [number, number] = [-75.1652, 39.9526];

export default function ReportIncidentAdjustLocationScreen({
  route,
  navigation,
}: ReportIncidentAdjustLocationScreenProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { location: sharedLocation, refresh } = useSharedLocation();
  const { draft, updateDraft, setAdjustEntryMode, resetDraft } = useReportDraft();
  const origin = route.params.origin;
  const isAdvancingInitialStepRef = useRef(false);
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

  useEffect(() => {
    if (origin !== 'initial_required') {
      return;
    }

    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (!isAdvancingInitialStepRef.current) {
        resetDraft();
        setAdjustEntryMode(null);
      }
    });

    return unsubscribe;
  }, [navigation, origin, resetDraft, setAdjustEntryMode]);

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

    if (origin === 'initial_required') {
      isAdvancingInitialStepRef.current = true;
      navigation.replace('ReportIncident', { sessionKey: route.params.sessionKey });
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
  const mapCenterCoordinate: [number, number] = candidateLocation
    ? [candidateLocation.longitude, candidateLocation.latitude]
    : currentDeviceLocation
      ? [currentDeviceLocation.longitude, currentDeviceLocation.latitude]
      : DEFAULT_FALLBACK_COORDINATE;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ReportAdjustLocationMap
        colors={colors}
        anchorRing={anchorRing}
        cameraBounds={cameraBounds}
        currentDeviceLocation={currentDeviceLocation}
        candidateLocation={candidateLocation}
        mapCenterCoordinate={mapCenterCoordinate}
        onMapPress={handleMapPress}
        onPinDrag={handleDrag}
        onUseCurrentLocation={handleUseCurrentLocation}
      />

      <ReportAdjustLocationSheet
        colors={colors}
        bottomInset={insets.bottom}
        locationPresentation={locationPresentation}
        reportRadiusState={reportRadiusState}
        distanceLabel={distanceLabel}
        hasCurrentDeviceLocation={Boolean(currentDeviceLocation)}
        canSaveLocation={canSaveLocation}
        onCancel={handleCancel}
        onSaveLocation={handleSaveLocation}
        onRetryLocation={handleRetryLocation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
