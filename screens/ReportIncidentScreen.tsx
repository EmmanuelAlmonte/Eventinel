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

import { useAppTheme } from '@hooks';
import { useReportDraft, useSharedLocation } from '@contexts';
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
    isDescriptionValid;
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
            shouldShowTypeError={shouldShowTypeError}
            shouldShowStillActiveError={shouldShowStillActiveError}
            shouldShowDescriptionError={shouldShowDescriptionError}
            onIncidentTypeChange={(value) => updateDraft({ incidentType: value })}
            onStillActiveChange={(value) => updateDraft({ stillActive: value })}
            onDescriptionChange={(value) => updateDraft({ description: value })}
            onDescriptionBlur={() => setDescriptionTouched(true)}
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
