import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as ExpoLocation from 'expo-location';
import { Input, Text } from '@rneui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@hooks';
import { useSharedLocation } from '@contexts';
import { MAP_STYLES } from '@lib/map/types';
import type {
  ReportIncidentType,
  ReportLocation,
  RootStackParamList,
  ReportSourceTab,
} from '@lib/navigation';

type ReportIncidentScreenProps = NativeStackScreenProps<RootStackParamList, 'ReportIncident'>;

const MIN_DESCRIPTION_LENGTH = 24;
const MAP_PREVIEW_ZOOM = 16.2;
const MAP_PREVIEW_FALLBACK_TIMEOUT_MS = 1800;
const LOCATION_META_LOADING = 'Finding nearby place details…';
const REPORT_TYPE_OPTIONS: Array<{
  value: ReportIncidentType;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { value: 'violent_crime', label: 'Crime', icon: 'shield-alert-outline' },
  { value: 'fire', label: 'Fire', icon: 'fire-alert' },
  { value: 'traffic', label: 'Traffic', icon: 'car-emergency' },
  { value: 'medical', label: 'Medical', icon: 'medical-bag' },
  { value: 'suspicious', label: 'Suspicious', icon: 'eye-outline' },
  { value: 'other', label: 'Other', icon: 'alert-circle-outline' },
];

type LocationPresentation = {
  primary: string;
  secondary: string;
  note?: string | null;
  tertiary?: string | null;
};

type LocationPreviewProps = {
  colors: ReturnType<typeof useAppTheme>['colors'];
  location: ReportLocation | null;
  presentation: LocationPresentation;
};

function formatCoordinateLine(location?: ReportLocation | null) {
  if (!location) {
    return null;
  }

  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

function formatSourceContext(sourceTab?: ReportSourceTab, hasLocation?: boolean) {
  if (sourceTab === 'Map') {
    return hasLocation ? 'Using current map area' : 'Move the map or enable location before continuing.';
  }

  if (sourceTab === 'Incidents') {
    return hasLocation ? 'Using nearby incident context' : 'Move the map or enable location before continuing.';
  }

  if (hasLocation) {
    return 'Using current location';
  }

  return 'Move the map or enable location before continuing.';
}

function formatBlockLabel(streetNumber?: string | null, street?: string | null) {
  if (!street) {
    return null;
  }

  if (!streetNumber) {
    return street;
  }

  const parsedStreetNumber = Number.parseInt(streetNumber, 10);
  if (!Number.isNaN(parsedStreetNumber) && parsedStreetNumber >= 100) {
    const blockBase = Math.floor(parsedStreetNumber / 100) * 100;
    return `${blockBase} block ${street}`;
  }

  return `${streetNumber} ${street}`;
}

function buildContextLine(address?: ExpoLocation.LocationGeocodedAddress | null) {
  if (!address) {
    return null;
  }

  const parts = [address.district, address.city, address.region].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(', ');
  }

  return address.subregion ?? address.country ?? null;
}

function buildLocationPresentation({
  sourceTab,
  location,
  locationNote,
  resolvedPlaceLabel,
  resolvedContextLine,
  isResolvingPlace,
}: {
  sourceTab?: ReportSourceTab;
  location?: ReportLocation | null;
  locationNote?: string;
  resolvedPlaceLabel?: string | null;
  resolvedContextLine?: string | null;
  isResolvingPlace?: boolean;
}): LocationPresentation {
  const trimmedNote = locationNote?.trim();
  const coordinateLine = formatCoordinateLine(location);
  const primary =
    resolvedPlaceLabel ??
    trimmedNote ??
    (sourceTab === 'Map'
      ? 'Current map area'
      : sourceTab === 'Incidents'
        ? 'Nearby incident area'
        : location
          ? 'Current location'
          : 'Location unavailable');
  const secondary =
    resolvedContextLine ??
    (isResolvingPlace && location
      ? LOCATION_META_LOADING
      : location
        ? formatSourceContext(sourceTab, true)
        : 'Move the map or enable location before continuing.');

  return {
    primary,
    secondary,
    note: resolvedPlaceLabel ? trimmedNote || null : null,
    tertiary: coordinateLine,
  };
}

function ReportLocationPreview({ colors, location, presentation }: LocationPreviewProps) {
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
    <View style={[styles.locationPreviewCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {markerCoordinate ? (
        <View style={styles.locationMapShell}>
          <Mapbox.MapView
            style={styles.locationMap}
            styleURL={MAP_STYLES.DARK}
            projection="mercator"
            surfaceView={false}
            scrollEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            zoomEnabled={false}
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

      <View style={styles.locationPreviewContent}>
        <View style={[styles.locationIconBadge, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.locationCopy}>
          <Text style={[styles.locationTitle, { color: colors.text }]}>{presentation.primary}</Text>
          <Text style={[styles.locationBody, { color: colors.textMuted }]}>{presentation.secondary}</Text>
          {presentation.note ? (
            <Text style={[styles.locationDetail, { color: colors.textMuted }]}>Detail: {presentation.note}</Text>
          ) : null}
          {presentation.tertiary ? (
            <Text style={[styles.locationMeta, { color: colors.textMuted }]}>{presentation.tertiary}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function ReportIncidentScreen({ navigation, route }: ReportIncidentScreenProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { location: sharedLocation } = useSharedLocation();
  const [incidentType, setIncidentType] = useState<ReportIncidentType | null>(route.params?.incidentType ?? null);
  const [description, setDescription] = useState(route.params?.description ?? '');
  const [locationNote, setLocationNote] = useState(route.params?.locationNote ?? '');
  const [hasAttemptedContinue, setHasAttemptedContinue] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [resolvedPlaceLabel, setResolvedPlaceLabel] = useState<string | null>(null);
  const [resolvedContextLine, setResolvedContextLine] = useState<string | null>(null);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);

  const effectiveLocation = useMemo(() => {
    if (route.params?.location) {
      return route.params.location;
    }

    if (!sharedLocation) {
      return null;
    }

    return {
      longitude: sharedLocation[0],
      latitude: sharedLocation[1],
    };
  }, [route.params?.location, sharedLocation]);

  const trimmedDescription = description.trim();
  const trimmedLocationNote = locationNote.trim();

  useEffect(() => {
    let isMounted = true;

    async function resolvePlaceLabel() {
      if (!effectiveLocation) {
        setResolvedPlaceLabel(null);
        setResolvedContextLine(null);
        setIsResolvingPlace(false);
        return;
      }

      setIsResolvingPlace(true);

      try {
        const [address] = await ExpoLocation.reverseGeocodeAsync({
          latitude: effectiveLocation.latitude,
          longitude: effectiveLocation.longitude,
        });

        if (!isMounted) {
          return;
        }

        setResolvedPlaceLabel(formatBlockLabel(address?.streetNumber, address?.street));
        setResolvedContextLine(buildContextLine(address));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.warn('[ReportIncident] Failed to resolve place label:', error);
        setResolvedPlaceLabel(null);
        setResolvedContextLine(null);
      } finally {
        if (isMounted) {
          setIsResolvingPlace(false);
        }
      }
    }

    void resolvePlaceLabel();

    return () => {
      isMounted = false;
    };
  }, [effectiveLocation?.latitude, effectiveLocation?.longitude]);

  const locationPresentation = useMemo(
    () =>
      buildLocationPresentation({
        sourceTab: route.params?.sourceTab,
        location: effectiveLocation,
        locationNote: trimmedLocationNote,
        resolvedPlaceLabel,
        resolvedContextLine,
        isResolvingPlace,
      }),
    [effectiveLocation, isResolvingPlace, resolvedContextLine, resolvedPlaceLabel, route.params?.sourceTab, trimmedLocationNote]
  );
  const isDescriptionValid = trimmedDescription.length >= MIN_DESCRIPTION_LENGTH;
  const hasLocation = Boolean(effectiveLocation);
  const canContinue = hasLocation && Boolean(incidentType) && isDescriptionValid;
  const shouldShowTypeError = hasAttemptedContinue && !incidentType;
  const shouldShowDescriptionError =
    (hasAttemptedContinue || descriptionTouched) && trimmedDescription.length > 0 && !isDescriptionValid;
  const shouldShowMissingLocation = hasAttemptedContinue && !hasLocation;

  useEffect(() => {
    if (route.params?.incidentType !== undefined) {
      setIncidentType(route.params.incidentType ?? null);
    }

    if (route.params?.description !== undefined) {
      setDescription(route.params.description);
    }

    if (route.params?.locationNote !== undefined) {
      setLocationNote(route.params.locationNote);
    }
  }, [route.params?.description, route.params?.incidentType, route.params?.locationNote]);

  function handleContinue() {
    setHasAttemptedContinue(true);
    if (!canContinue || !incidentType) {
      return;
    }

    navigation.navigate('ReportIncidentReview', {
      sourceTab: route.params?.sourceTab,
      location: effectiveLocation,
      incidentType,
      description: trimmedDescription,
      locationNote: trimmedLocationNote || undefined,
    });
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 16,
              paddingBottom: 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Confirm the place, describe what happened, and review the report before it is ready to send.
            </Text>
          </View>

          <View style={[styles.locationSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.stepLabel, { color: colors.textMuted }]}>Step 1</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
            </View>

            <ReportLocationPreview
              colors={colors}
              location={effectiveLocation}
              presentation={locationPresentation}
            />

            {shouldShowMissingLocation ? (
              <Text style={[styles.validationText, { color: '#F97316' }]}>
                A location is required before you can continue.
              </Text>
            ) : null}

            <Input
              placeholder="Optional landmark, building, or block detail"
              value={locationNote}
              onChangeText={setLocationNote}
              autoCapitalize="sentences"
              autoCorrect
              containerStyle={styles.inputContainer}
              inputContainerStyle={[
                styles.input,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
              inputStyle={[styles.inputText, { color: colors.text }]}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={[styles.detailsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.stepLabel, { color: colors.textMuted }]}>Step 2</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>What happened</Text>
            </View>

            <Text style={[styles.sectionHelper, { color: colors.textMuted }]}>
              Choose the closest report type, then describe what happened, where on the block it is happening, and whether it is still active.
            </Text>

            <View style={styles.typeGrid}>
              {REPORT_TYPE_OPTIONS.map((option) => {
                const isSelected = incidentType === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${option.label} report type`}
                    onPress={() => setIncidentType(option.value)}
                    style={({ pressed }) => [
                      styles.typeChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.background,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                      pressed && styles.typeChipPressed,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={16}
                      color={isSelected ? '#FFFFFF' : colors.text}
                    />
                    <Text style={[styles.typeChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {shouldShowTypeError ? (
              <Text style={[styles.validationText, { color: '#F97316' }]}>
                Choose the report type before continuing.
              </Text>
            ) : null}

            <Input
              placeholder="Describe what happened"
              value={description}
              onChangeText={setDescription}
              onBlur={() => setDescriptionTouched(true)}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              containerStyle={styles.inputContainer}
              inputContainerStyle={[
                styles.input,
                styles.multilineInput,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
              inputStyle={[styles.inputText, styles.multilineInputText, { color: colors.text }]}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
              Be specific about what happened, where on the block it is happening, and whether it is ongoing.
            </Text>

            {shouldShowDescriptionError ? (
              <Text style={[styles.validationText, { color: '#F97316' }]}>
                Add at least {MIN_DESCRIPTION_LENGTH} characters so the report is specific enough to review.
              </Text>
            ) : null}
          </View>

          <View style={[styles.optionalRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="paperclip" size={16} color={colors.textMuted} />
            <View style={styles.optionalCopy}>
              <Text style={[styles.optionalBody, { color: colors.textMuted }]}>
                Photos, links, and extra context can be added after you review the core report.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {!canContinue ? (
            <Text style={[styles.footerMessage, { color: colors.textMuted }]}>
              {hasLocation
                ? 'Choose a type and add a fuller description to continue.'
                : 'Location is still needed before this report can move to review.'}
            </Text>
          ) : (
            <Text style={[styles.footerMessage, { color: colors.textMuted }]}>
              Continue to review the report before anything is sent.
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue to report review"
            onPress={handleContinue}
            disabled={!canContinue}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: canContinue ? colors.primary : colors.surface,
                borderColor: canContinue ? colors.primary : colors.border,
              },
              pressed && canContinue && styles.primaryButtonPressed,
            ]}
          >
            <Text style={[styles.primaryButtonText, { color: canContinue ? '#FFFFFF' : colors.textMuted }]}>
              Continue to review
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  locationSection: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  detailsSection: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHelper: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  locationPreviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  locationMapShell: {
    height: 96,
    backgroundColor: '#0F172A',
  },
  locationMap: {
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
  locationPreviewContent: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCopy: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  locationBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  locationMeta: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  locationDetail: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  typeChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeChipPressed: {
    opacity: 0.92,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputContainer: {
    paddingHorizontal: 0,
    marginBottom: 0,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  inputText: {
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 152,
    paddingTop: 14,
  },
  multilineInputText: {
    minHeight: 118,
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
  },
  validationText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  optionalRow: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  optionalCopy: {
    flex: 1,
  },
  optionalBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footerMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
