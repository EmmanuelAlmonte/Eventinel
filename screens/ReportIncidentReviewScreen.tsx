import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNDK, useNDKCurrentPubkey } from '@nostr-dev-kit/mobile';

import { showToast } from '@components/ui';
import { useRelayStatus, useReportDraft, useSharedLocation } from '@contexts';
import { useAppTheme } from '@hooks';
import { createIncidentEvent } from '@lib/nostr/events/incident';
import { getReportRadiusState } from '@lib/utils/reportLocationRadius';
import type { ReportIncidentType, ReportSourceTab, RootStackParamList } from '@lib/navigation';

import { ReportLocationPreview } from './reportIncident/ReportLocationPreview';
import { buildLocationPresentation, useResolvedReportLocation } from './reportIncident/locationPresentation';

type ReportIncidentReviewScreenProps = NativeStackScreenProps<RootStackParamList, 'ReportIncidentReview'>;

const TYPE_LABELS: Record<ReportIncidentType, string> = {
  violent_crime: 'Crime',
  fire: 'Fire',
  traffic: 'Traffic',
  medical: 'Medical',
  suspicious: 'Suspicious',
  other: 'Other',
};

const TYPE_SEVERITY: Record<ReportIncidentType, 1 | 2 | 3 | 4 | 5> = {
  violent_crime: 3,
  fire: 4,
  traffic: 2,
  medical: 4,
  suspicious: 2,
  other: 2,
};

function buildAddress(
  sourceTab?: string,
  locationNote?: string,
  locationLabel?: string | null,
  hasLocation?: boolean
) {
  if (locationLabel) {
    return locationLabel;
  }

  if (locationNote?.trim()) {
    return locationNote.trim();
  }

  if (sourceTab === 'Map') {
    return 'Current map area';
  }

  if (sourceTab === 'Incidents') {
    return 'Nearby incident area';
  }

  if (hasLocation) {
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

function buildReturnLabel(sourceTab?: ReportSourceTab) {
  if (sourceTab === 'Incidents') {
    return 'Back to incidents';
  }

  if (sourceTab === 'Map') {
    return 'Back to map';
  }

  return 'Back to app';
}

export default function ReportIncidentReviewScreen({ navigation, route }: ReportIncidentReviewScreenProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { location: sharedLocation } = useSharedLocation();
  const { stats: relayStats } = useRelayStatus();
  const { draft, sessionKey, resetDraft, setAdjustEntryMode } = useReportDraft();
  const { ndk } = useNDK();
  const currentPubkey = useNDKCurrentPubkey();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const { resolvedPlaceLabel, resolvedContextLine } = useResolvedReportLocation(draft.location);
  const locationPresentation = useMemo(
    () =>
      buildLocationPresentation({
        sourceTab: draft.sourceTab,
        location: draft.location,
        locationNote: draft.locationNote,
        resolvedPlaceLabel,
        resolvedContextLine,
        missingLocationCopy: 'No location available for this draft yet.',
      }),
    [draft.location, draft.locationNote, draft.sourceTab, resolvedContextLine, resolvedPlaceLabel]
  );
  const reportRadiusState = useMemo(
    () => getReportRadiusState(currentDeviceLocation, draft.location),
    [currentDeviceLocation, draft.location]
  );
  const connectedRelayCount = relayStats.connected;
  const reportAddress = buildAddress(
    draft.sourceTab,
    draft.locationNote,
    resolvedPlaceLabel,
    Boolean(draft.location)
  );
  const returnLabel = buildReturnLabel(draft.sourceTab);

  async function handleSubmit() {
    if (isSubmitting || !draft.incidentType || draft.stillActive === null) {
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

    if (!draft.location) {
      showToast.error('Location required', 'Move the map or enable location, then try again.');
      return;
    }

    if (!reportRadiusState.isWithinRadius) {
      showToast.error('Report too far away', reportRadiusState.message);
      return;
    }

    if (connectedRelayCount === 0) {
      showToast.error('No relay connection', 'Connect to at least one relay before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const event = createIncidentEvent(ndk, {
        type: draft.incidentType,
        severity: TYPE_SEVERITY[draft.incidentType],
        title: buildIncidentTitle(draft.incidentType, draft.locationNote),
        description: draft.description,
        location: {
          lat: draft.location.latitude,
          lng: draft.location.longitude,
          address: reportAddress,
        },
        occurredAt: new Date(),
        source: 'community',
        sourceId: `community-${Date.now()}`,
        metadata: {
          sourceTab: draft.sourceTab,
          entrypoint: 'report-incident-flow',
          locationNote: draft.locationNote || undefined,
          stillActive: draft.stillActive,
          reportStatus: draft.stillActive ? 'active' : 'not_active',
        },
      });

      await event.publish();
      const nextRoute = {
        sourceTab: draft.sourceTab,
        incidentType: draft.incidentType,
        locationLabel: reportAddress,
        relayCount: connectedRelayCount,
        stillActive: draft.stillActive,
      } as const;
      resetDraft();
      navigation.replace('ReportIncidentSubmitted', nextRoute);
    } catch (error) {
      console.warn('[ReportIncident] Failed to publish report:', error);
      showToast.error('Submit failed', error instanceof Error ? error.message : 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEditLocation() {
    setAdjustEntryMode('review_edit');
    navigation.navigate('ReportIncidentAdjustLocation', {
      origin: 'review_edit',
      sessionKey: route.params.sessionKey,
    });
  }

  function handleEditDetails() {
    navigation.goBack();
  }

  if (!draft.incidentType || draft.stillActive === null || sessionKey !== route.params.sessionKey) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No report draft to review.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to report"
          onPress={() => navigation.popToTop()}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Return to app</Text>
        </Pressable>
      </View>
    );
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
          <ReportLocationPreview
            colors={colors}
            location={draft.location}
            presentation={locationPresentation}
            mapHeight={80}
          />
          <Text
            style={[
              styles.locationStatus,
              { color: reportRadiusState.isWithinRadius ? colors.success : colors.warning },
            ]}
          >
            {reportRadiusState.message}
          </Text>
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
              <Text style={styles.typeBadgeText}>{TYPE_LABELS[draft.incidentType]}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: draft.stillActive ? colors.success : colors.background,
                  borderColor: draft.stillActive ? colors.success : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: draft.stillActive ? '#FFFFFF' : colors.text },
                ]}
              >
                {draft.stillActive ? 'Still active' : 'No longer active'}
              </Text>
            </View>
          </View>
          <Text style={[styles.description, { color: colors.text }]}>{draft.description.trim()}</Text>
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
          {!reportRadiusState.isWithinRadius
            ? reportRadiusState.message
            : draft.stillActive === null
              ? 'Choose whether the incident is still active before submitting.'
            : connectedRelayCount > 0
              ? `Ready to publish to ${connectedRelayCount} connected relay${connectedRelayCount === 1 ? '' : 's'}.`
              : `Connect a relay to submit. ${returnLabel} is available after send.`}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Submit report"
          onPress={handleSubmit}
          disabled={
            isSubmitting ||
            connectedRelayCount === 0 ||
            !draft.location ||
            draft.stillActive === null ||
            !reportRadiusState.isWithinRadius
          }
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor:
                isSubmitting ||
                connectedRelayCount === 0 ||
                !draft.location ||
                draft.stillActive === null ||
                !reportRadiusState.isWithinRadius
                  ? colors.surface
                  : colors.primary,
              borderColor:
                isSubmitting ||
                connectedRelayCount === 0 ||
                !draft.location ||
                draft.stillActive === null ||
                !reportRadiusState.isWithinRadius
                  ? colors.border
                  : colors.primary,
            },
            pressed &&
              !isSubmitting &&
              connectedRelayCount > 0 &&
              draft.location &&
              draft.stillActive !== null &&
              reportRadiusState.isWithinRadius &&
              styles.buttonPressed,
          ]}
        >
          <Text
            style={[
              styles.primaryButtonText,
              {
                color:
                  isSubmitting ||
                  connectedRelayCount === 0 ||
                  !draft.location ||
                  draft.stillActive === null ||
                  !reportRadiusState.isWithinRadius
                    ? colors.textMuted
                    : '#FFFFFF',
              },
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
  locationStatus: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  statusBadge: {
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
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
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
