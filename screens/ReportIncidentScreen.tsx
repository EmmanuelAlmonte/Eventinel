import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@rneui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { useReportDraft, useSharedLocation } from '@contexts';
import { useAppTheme } from '@hooks';
import { buildBlossomCapabilityState, buildBlossomConfig } from '@lib/media/blossomConfig';
import { pickMediaFromLibrary } from '@lib/media/pickMedia';
import { validatePickedMediaForUpload } from '@lib/media/validatePickedMedia';
import { reportMediaAttachmentFromBlossomUpload } from '@contexts/ReportDraftContext';
import { uploadToBlossom, type BlossomUploadError } from '@lib/media/blossomUpload';
import { getReportRadiusState } from '@lib/utils/reportLocationRadius';
import type { RootStackParamList } from '@lib/navigation';

import { buildLocationPresentation, useResolvedReportLocation } from './reportIncident/locationPresentation';
import { ReportIncidentDetailsSection, MIN_DESCRIPTION_LENGTH } from './reportIncident/ReportIncidentDetailsSection';
import { ReportIncidentFooter } from './reportIncident/ReportIncidentFooter';
import { ReportIncidentLocationSection } from './reportIncident/ReportIncidentLocationSection';

type ReportIncidentScreenProps = NativeStackScreenProps<RootStackParamList, 'ReportIncident'>;

export default function ReportIncidentScreen({ navigation, route }: ReportIncidentScreenProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { location: sharedLocation } = useSharedLocation();
  const { draft, startDraft, updateDraft, setAdjustEntryMode, resetDraft } = useReportDraft();
  const [hasAttemptedContinue, setHasAttemptedContinue] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState<number | null>(null);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
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
  const blossomCapability = useMemo(() => {
    const config = buildBlossomConfig({
      ...process.env,
      ...(Constants?.expoConfig?.extra ?? {}),
    });
    return buildBlossomCapabilityState(config);
  }, []);

  useEffect(() => {
    startDraft(route.params.sessionKey);
  }, [route.params.sessionKey, startDraft]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      resetDraft();
      setAdjustEntryMode(null);
    });

    return unsubscribe;
  }, [navigation, resetDraft, setAdjustEntryMode]);

  const { resolvedPlaceLabel, resolvedContextLine, isResolvingPlace } = useResolvedReportLocation(draft.location);
  const locationPresentation = useMemo(
    () =>
      buildLocationPresentation({
        sourceTab: draft.sourceTab,
        location: draft.location,
        locationNote: draft.locationNote,
        resolvedPlaceLabel,
        resolvedContextLine,
        isResolvingPlace,
      }),
    [
      draft.location,
      draft.locationNote,
      draft.sourceTab,
      isResolvingPlace,
      resolvedContextLine,
      resolvedPlaceLabel,
    ]
  );
  const trimmedDescription = draft.description.trim();
  const isDescriptionValid = trimmedDescription.length >= MIN_DESCRIPTION_LENGTH;
  const hasLocation = Boolean(draft.location);
  const reportRadiusState = useMemo(
    () => getReportRadiusState(currentDeviceLocation, draft.location),
    [currentDeviceLocation, draft.location]
  );
  const canContinue =
    hasLocation &&
    reportRadiusState.isWithinRadius &&
    Boolean(draft.incidentType) &&
    draft.stillActive !== null &&
    isDescriptionValid &&
    !isUploadingMedia;
  const shouldShowTypeError = hasAttemptedContinue && !draft.incidentType;
  const shouldShowStillActiveError = hasAttemptedContinue && draft.stillActive === null;
  const shouldShowDescriptionError =
    (hasAttemptedContinue || descriptionTouched) &&
    trimmedDescription.length > 0 &&
    !isDescriptionValid;
  const shouldShowMissingLocation = hasAttemptedContinue && !hasLocation;

  function handleContinue() {
    setHasAttemptedContinue(true);
    if (!canContinue) {
      return;
    }

    navigation.navigate('ReportIncidentReview', {
      sessionKey: route.params.sessionKey,
    });
  }

  function handleAdjustLocation() {
    setAdjustEntryMode('report_edit');
    navigation.navigate('ReportIncidentAdjustLocation', {
      origin: 'report_edit',
      sessionKey: route.params.sessionKey,
    });
  }

  async function handleAddMedia() {
    if (isUploadingMedia) return;

    setMediaUploadError(null);

    if (blossomCapability.status === 'missing-upload-server') {
      setMediaUploadError('No Blossom upload server is configured for report media.');
      return;
    }

    try {
      const pickedMedia = await pickMediaFromLibrary();
      if (!pickedMedia) return;

      const mediaValidation = await validatePickedMediaForUpload(pickedMedia);
      if (!mediaValidation.ok) {
        setMediaUploadError(mediaValidation.error.message);
        return;
      }

      setIsUploadingMedia(true);
      setMediaUploadProgress(0);

      const outcome = await uploadToBlossom({
        media: pickedMedia,
        capability: blossomCapability,
        onProgress: (progress) => {
          setMediaUploadProgress(progress.fraction);
        },
      });

      if (!outcome.ok) {
        setMediaUploadError(formatMediaUploadError(outcome.error));
        return;
      }

      const attachment = reportMediaAttachmentFromBlossomUpload(outcome.result);
      updateDraft((currentDraft) => ({
        mediaAttachments: [...currentDraft.mediaAttachments, attachment],
      }));
    } catch (error) {
      setMediaUploadError(error instanceof Error ? error.message : 'Failed to add report media.');
    } finally {
      setIsUploadingMedia(false);
      setMediaUploadProgress(null);
    }
  }

  function handleRemoveMediaAttachment(attachmentId: string) {
    updateDraft({
      mediaAttachments: draft.mediaAttachments.filter((attachment) => attachment.id !== attachmentId),
    });
    setMediaUploadError(null);
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
              Confirm the place and describe what happened.
            </Text>
          </View>

          <ReportIncidentLocationSection
            colors={colors}
            location={draft.location}
            locationNote={draft.locationNote}
            locationPresentation={locationPresentation}
            hasLocation={hasLocation}
            shouldShowMissingLocation={shouldShowMissingLocation}
            reportRadiusState={reportRadiusState}
            onAdjustLocation={handleAdjustLocation}
            onLocationNoteChange={(value) => updateDraft({ locationNote: value })}
          />

          <ReportIncidentDetailsSection
            colors={colors}
            incidentType={draft.incidentType}
            stillActive={draft.stillActive}
            description={draft.description}
            mediaAttachments={draft.mediaAttachments}
            isUploadingMedia={isUploadingMedia}
            mediaUploadProgress={mediaUploadProgress}
            mediaUploadError={mediaUploadError}
            shouldShowTypeError={shouldShowTypeError}
            shouldShowStillActiveError={shouldShowStillActiveError}
            shouldShowDescriptionError={shouldShowDescriptionError}
            onIncidentTypeChange={(value) => updateDraft({ incidentType: value })}
            onStillActiveChange={(value) => updateDraft({ stillActive: value })}
            onDescriptionChange={(value) => updateDraft({ description: value })}
            onDescriptionBlur={() => setDescriptionTouched(true)}
            onAddMedia={handleAddMedia}
            onRemoveMediaAttachment={handleRemoveMediaAttachment}
          />
        </ScrollView>

        <ReportIncidentFooter
          colors={colors}
          bottomInset={insets.bottom}
          canContinue={canContinue}
          hasLocation={hasLocation}
          incidentType={draft.incidentType}
          stillActive={draft.stillActive}
          reportRadiusState={reportRadiusState}
          onContinue={handleContinue}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function formatMediaUploadError(error: BlossomUploadError): string {
  switch (error.type) {
    case 'validation':
    case 'server-rejected':
    case 'auth-missing':
    case 'auth-failed':
    case 'file-read-failed':
    case 'hash-failed':
    case 'invalid-response':
    case 'retry-exhausted':
      return error.message;
    case 'cancelled':
      return 'Media upload was cancelled.';
    case 'network':
      return `Network error while uploading media: ${error.message}`;
    case 'timeout':
      return 'Media upload timed out. Try again.';
    default:
      return 'Failed to upload report media.';
  }
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
