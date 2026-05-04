import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNDK, useNDKCurrentPubkey } from '@nostr-dev-kit/mobile';

import { showToast } from '@components/ui';
import { useRelayStatus, useReportDraft, useSharedLocation } from '@contexts';
import { useAppTheme } from '@hooks';
import { getReportRadiusState } from '@lib/utils/reportLocationRadius';
import type { ReportSourceTab, RootStackParamList } from '@lib/navigation';
import { submitIncidentReport } from '../application/report';
import {
  buildReportAddress,
  buildReportReviewReturnLabel,
  canSubmitReportReview,
} from '../domain/report';

import { ReportIncidentReviewEmptyState } from './reportIncident/ReportIncidentReviewEmptyState';
import { ReportIncidentReviewFooter } from './reportIncident/ReportIncidentReviewFooter';
import {
  ReportReviewLocationSection,
  ReportReviewMediaSection,
  ReportReviewSummarySection,
} from './reportIncident/ReportIncidentReviewSections';
import { buildLocationPresentation, useResolvedReportLocation } from './reportIncident/locationPresentation';

type ReportIncidentReviewScreenProps = NativeStackScreenProps<RootStackParamList, 'ReportIncidentReview'>;
type MainResetRoute = {
  name: 'Main';
  params?: RootStackParamList['Main'];
  state?: {
    index: number;
    routes: { name: ReportSourceTab }[];
  };
};

function buildSubmittedReturnRoute(sourceTab?: ReportSourceTab): MainResetRoute {
  if (!sourceTab) {
    return { name: 'Main' };
  }

  return {
    name: 'Main',
    params: {
      screen: sourceTab,
    },
    state: {
      index: 0,
      routes: [{ name: sourceTab }],
    },
  };
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
  const hasReportLocation = Boolean(draft.location);
  const reportAddress = buildReportAddress({
    sourceTab: draft.sourceTab,
    locationNote: draft.locationNote,
    locationLabel: resolvedPlaceLabel,
    hasLocation: hasReportLocation,
  });
  const returnLabel = buildReportReviewReturnLabel(draft.sourceTab);
  const canSubmit = canSubmitReportReview({
    isSubmitting,
    connectedRelayCount,
    hasLocation: hasReportLocation,
    stillActive: draft.stillActive,
    isWithinRadius: reportRadiusState.isWithinRadius,
  });

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
      await submitIncidentReport({
        ndk,
        incidentType: draft.incidentType,
        description: draft.description,
        location: draft.location,
        reportAddress,
        sourceTab: draft.sourceTab,
        locationNote: draft.locationNote,
        stillActive: draft.stillActive,
        mediaAttachments: draft.mediaAttachments,
      });

      const nextRoute = {
        sourceTab: draft.sourceTab,
        incidentType: draft.incidentType,
        locationLabel: reportAddress,
        relayCount: connectedRelayCount,
        stillActive: draft.stillActive,
      } as const;
      resetDraft();
      navigation.reset({
        index: 1,
        routes: [
          buildSubmittedReturnRoute(draft.sourceTab),
          { name: 'ReportIncidentSubmitted', params: nextRoute },
        ],
      });
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
      <ReportIncidentReviewEmptyState
        colors={colors}
        onBackToReport={() => navigation.popToTop()}
      />
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

        <ReportReviewLocationSection
          colors={colors}
          location={draft.location}
          locationPresentation={locationPresentation}
          reportRadiusState={reportRadiusState}
          onEditLocation={handleEditLocation}
        />

        <ReportReviewSummarySection
          colors={colors}
          incidentType={draft.incidentType}
          stillActive={draft.stillActive}
          description={draft.description}
          onEditDetails={handleEditDetails}
        />

        <ReportReviewMediaSection colors={colors} attachments={draft.mediaAttachments} />
      </ScrollView>

      <ReportIncidentReviewFooter
        colors={colors}
        bottomInset={insets.bottom}
        reportRadiusState={reportRadiusState}
        connectedRelayCount={connectedRelayCount}
        stillActive={draft.stillActive}
        returnLabel={returnLabel}
        isSubmitting={isSubmitting}
        canSubmit={canSubmit}
        onSubmit={handleSubmit}
      />
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
});
