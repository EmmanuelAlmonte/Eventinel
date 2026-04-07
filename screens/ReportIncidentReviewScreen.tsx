import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as ExpoLocation from 'expo-location';
import { Text } from '@rneui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNDK, useNDKCurrentPubkey } from '@nostr-dev-kit/mobile';

import { showToast } from '@components/ui';
import { useAppTheme } from '@hooks';
import { MAP_STYLES } from '@lib/map/types';
import { createIncidentEvent } from '@lib/nostr/events/incident';
import { isConnected } from '@lib/relay/status';
import type {
  ReportIncidentType,
  ReportLocation,
  RootStackParamList,
  ReportSourceTab,
} from '@lib/navigation';

type ReportIncidentReviewScreenProps = NativeStackScreenProps<RootStackParamList, 'ReportIncidentReview'>;
const MAP_PREVIEW_ZOOM = 16.2;
const MAP_PREVIEW_FALLBACK_TIMEOUT_MS = 1800;
const MAP_PREVIEW_LOGO_POSITION = { bottom: 8, left: 8 };
const MAP_PREVIEW_ATTRIBUTION_POSITION = { bottom: 8, right: 8 };

const TYPE_LABELS: Record<ReportIncidentType, string> = {
  violent_crime: 'Crime',
  fire: 'Fire',
  traffic: 'Traffic',
  medical: 'Medical',
  suspicious: 'Suspicious',
  other: 'Other',
};

function formatCoordinateLine(location?: ReportLocation | null) {
  if (!location) {
    return null;
  }

  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

function formatSourceContext(sourceTab?: ReportSourceTab, hasLocation?: boolean) {
  if (sourceTab === 'Map') {
    return hasLocation ? 'Using current map area' : 'Location unavailable';
  }

  if (sourceTab === 'Incidents') {
    return hasLocation ? 'Using nearby incident context' : 'Location unavailable';
  }

  if (hasLocation) {
    return 'Using current location';
  }

  return 'No location available for this draft yet.';
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

function buildLocationPresentation({
  sourceTab,
  location,
  locationNote,
  resolvedPlaceLabel,
  resolvedContextLine,
}: {
  sourceTab?: ReportSourceTab;
  location?: ReportLocation | null;
  locationNote?: string;
  resolvedPlaceLabel?: string | null;
  resolvedContextLine?: string | null;
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

  return {
    primary,
    secondary: resolvedContextLine ?? formatSourceContext(sourceTab, Boolean(location)),
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
            logoEnabled={true}
            logoPosition={MAP_PREVIEW_LOGO_POSITION}
            attributionEnabled={true}
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

      <View style={styles.locationPreviewContent}>
        <View style={[styles.iconBadge, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.locationCopy}>
          <Text style={[styles.locationTitle, { color: colors.text }]}>{presentation.primary}</Text>
          <Text style={[styles.locationContext, { color: colors.textMuted }]}>{presentation.secondary}</Text>
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

const TYPE_SEVERITY: Record<ReportIncidentType, 1 | 2 | 3 | 4 | 5> = {
  violent_crime: 3,
  fire: 4,
  traffic: 2,
  medical: 4,
  suspicious: 2,
  other: 2,
};

function buildAddress(
  sourceTab?: ReportSourceTab,
  locationNote?: string,
  location?: ReportLocation | null,
  resolvedPlaceLabel?: string | null
) {
  if (resolvedPlaceLabel) {
    return resolvedPlaceLabel;
  }

  if (sourceTab === 'Map') {
    return 'Current map area';
  }

  if (sourceTab === 'Incidents') {
    return 'Nearby incident area';
  }

  if (location) {
    return 'Current location';
  }

  return 'Unknown location';
}

function buildIncidentTitle(incidentType: ReportIncidentType, locationNote?: string) {
  const typeLabel = TYPE_LABELS[incidentType];
  const trimmedNote = locationNote?.trim();
  if (trimmedNote) {
    return `${typeLabel} near ${trimmedNote}`;
  }

  return `${typeLabel} report`;
}

export default function ReportIncidentReviewScreen({
  navigation,
  route,
}: ReportIncidentReviewScreenProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { ndk } = useNDK();
  const currentPubkey = useNDKCurrentPubkey();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvedPlaceLabel, setResolvedPlaceLabel] = useState<string | null>(null);
  const [resolvedContextLine, setResolvedContextLine] = useState<string | null>(null);
  const { description, incidentType, location, locationNote, sourceTab } = route.params;

  useEffect(() => {
    let isMounted = true;

    async function resolvePlaceLabel() {
      if (!location) {
        setResolvedPlaceLabel(null);
        setResolvedContextLine(null);
        return;
      }

      try {
        const [address] = await ExpoLocation.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
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

        console.warn('[ReportIncidentReview] Failed to resolve place label:', error);
        setResolvedPlaceLabel(null);
        setResolvedContextLine(null);
      }
    }

    void resolvePlaceLabel();

    return () => {
      isMounted = false;
    };
  }, [location?.latitude, location?.longitude]);

  const locationPresentation = useMemo(
    () => buildLocationPresentation({ sourceTab, location, locationNote, resolvedPlaceLabel, resolvedContextLine }),
    [location, locationNote, resolvedContextLine, resolvedPlaceLabel, sourceTab]
  );
  const connectedRelayCount = useMemo(() => {
    if (!ndk) {
      return 0;
    }

    return Array.from(ndk.pool.relays.values()).filter((relay) => isConnected(relay.status)).length;
  }, [ndk]);

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    if (!ndk) {
      showToast.error('Reporting unavailable', 'NDK is not initialized yet.');
      return;
    }

    if (!currentPubkey) {
      showToast.error('Sign in required', 'You need a Nostr identity before you can submit a report.');
      return;
    }

    if (!location) {
      showToast.error('Location required', 'Move the map or enable location, then try again.');
      return;
    }

    if (connectedRelayCount === 0) {
      showToast.error('No relay connection', 'Connect to at least one relay before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const event = createIncidentEvent(ndk, {
        type: incidentType,
        severity: TYPE_SEVERITY[incidentType],
        title: buildIncidentTitle(incidentType, locationNote),
        description,
        location: {
          lat: location.latitude,
          lng: location.longitude,
          address: buildAddress(sourceTab, locationNote, location, resolvedPlaceLabel),
        },
        occurredAt: new Date(),
        source: 'community',
        sourceId: `community-${Date.now()}`,
        metadata: {
          sourceTab,
          entrypoint: 'report-incident-flow',
          locationNote: locationNote || undefined,
        },
      });

      await event.publish();
      showToast.success('Report submitted', connectedRelayCount > 1 ? `Published to ${connectedRelayCount} relays` : 'Published to 1 relay');
      navigation.popToTop();
    } catch (error) {
      console.warn('[ReportIncident] Failed to publish report:', error);
      showToast.error('Submit failed', error instanceof Error ? error.message : 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEditLocation() {
    navigation.navigate('ReportIncident', {
      sourceTab,
      location,
      incidentType,
      description,
      locationNote,
      editTarget: 'location',
    });
  }

  function handleEditDetails() {
    navigation.navigate('ReportIncident', {
      sourceTab,
      location,
      incidentType,
      description,
      locationNote,
      editTarget: 'details',
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Confirm the place before you submit.
          </Text>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit location"
              onPress={handleEditLocation}
              style={({ pressed }) => [styles.editAction, pressed && styles.buttonPressed]}
            >
              <Text style={[styles.editActionText, { color: colors.primary }]}>Edit location</Text>
            </Pressable>
          </View>
          <ReportLocationPreview colors={colors} location={location ?? null} presentation={locationPresentation} />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Report summary</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit report details"
              onPress={handleEditDetails}
              style={({ pressed }) => [styles.editAction, pressed && styles.buttonPressed]}
            >
              <Text style={[styles.editActionText, { color: colors.primary }]}>Edit details</Text>
            </Pressable>
          </View>
          <View style={styles.typeRow}>
            <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.typeBadgeText}>{TYPE_LABELS[incidentType]}</Text>
            </View>
          </View>
          <Text style={[styles.description, { color: colors.text }]}>{description}</Text>
        </View>

        <View style={[styles.infoRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="paperclip" size={16} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Photos, links, and any extra follow-up context can be added in a later step.
          </Text>
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
        <Text style={[styles.footerMessage, { color: colors.textMuted }]}>
          {connectedRelayCount > 0
            ? `Ready to publish to ${connectedRelayCount} connected relay${connectedRelayCount === 1 ? '' : 's'}.`
            : 'Connect a relay to submit.'}
        </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit report"
            onPress={handleSubmit}
            disabled={isSubmitting || connectedRelayCount === 0 || !location}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor:
                  isSubmitting || connectedRelayCount === 0 || !location ? colors.surface : colors.primary,
                borderColor:
                  isSubmitting || connectedRelayCount === 0 || !location ? colors.border : colors.primary,
              },
              pressed && !isSubmitting && connectedRelayCount > 0 && location && styles.buttonPressed,
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: isSubmitting || connectedRelayCount === 0 || !location ? colors.textMuted : '#FFFFFF' },
              ]}
            >
              {isSubmitting ? 'Submitting…' : 'Submit report'}
            </Text>
          </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  editAction: {
    paddingVertical: 2,
  },
  editActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  locationPreviewCard: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  locationMapShell: {
    height: 80,
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
  iconBadge: {
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
    marginBottom: 4,
  },
  locationContext: {
    fontSize: 13,
    lineHeight: 19,
  },
  locationMeta: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
    opacity: 0.72,
  },
  locationDetail: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
  },
  infoRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  footerMessage: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  primaryButton: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
