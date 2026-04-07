import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Input, Text } from '@rneui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@hooks';
import { useReportDraft, useSharedLocation } from '@contexts';
import { getReportRadiusState } from '@lib/utils/reportLocationRadius';
import type { ReportIncidentType, RootStackParamList } from '@lib/navigation';

import { ReportLocationPreview } from './reportIncident/ReportLocationPreview';
import { buildLocationPresentation, useResolvedReportLocation } from './reportIncident/locationPresentation';

type ReportIncidentScreenProps = NativeStackScreenProps<RootStackParamList, 'ReportIncident'>;

const MIN_DESCRIPTION_LENGTH = 24;
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
    return () => {
      resetDraft();
    };
  }, [resetDraft]);

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
    hasLocation && reportRadiusState.isWithinRadius && Boolean(draft.incidentType) && isDescriptionValid;
  const shouldShowTypeError = hasAttemptedContinue && !draft.incidentType;
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

    navigation.navigate('ReportIncidentReview');
  }

  function handleAdjustLocation() {
    setAdjustEntryMode('report_edit');
    navigation.navigate('ReportIncidentAdjustLocation', {
      origin: 'report_edit',
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

          <View style={[styles.locationSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.stepLabel, { color: colors.textMuted }]}>Step 1</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
            </View>

            <ReportLocationPreview
              colors={colors}
              location={draft.location}
              presentation={locationPresentation}
              mapHeight={116}
            />

            {shouldShowMissingLocation ? (
              <Text style={[styles.validationText, { color: '#F97316' }]}>
                A location is required before you can continue.
              </Text>
            ) : !hasLocation ? (
              <Text style={[styles.validationText, { color: colors.textMuted }]}>
                Select a nearby incident location on the map before continuing.
              </Text>
            ) : hasLocation ? (
              <Text
                style={[
                  styles.validationText,
                  { color: reportRadiusState.isWithinRadius ? colors.success : colors.warning },
                ]}
              >
                {reportRadiusState.message}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adjust report location on map"
              onPress={handleAdjustLocation}
              style={({ pressed }) => [
                styles.secondaryAction,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
                pressed && styles.secondaryActionPressed,
              ]}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={16} color={colors.text} />
              <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                {hasLocation ? 'Adjust on map' : 'Choose on map'}
              </Text>
            </Pressable>

            <Input
              placeholder="Optional landmark, building, or block detail"
              value={draft.locationNote}
              onChangeText={(value) => updateDraft({ locationNote: value })}
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
                const isSelected = draft.incidentType === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${option.label} report type`}
                    onPress={() => updateDraft({ incidentType: option.value })}
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
              value={draft.description}
              onChangeText={(value) => updateDraft({ description: value })}
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
              {!hasLocation
                ? 'Location is still needed before this report can move to review.'
                : !reportRadiusState.isWithinRadius
                  ? reportRadiusState.message
                  : 'Choose a type and add a fuller description to continue.'}
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
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
  secondaryAction: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionPressed: {
    opacity: 0.92,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
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
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  optionalCopy: {
    flex: 1,
  },
  optionalBody: {
    fontSize: 10,
    lineHeight: 15,
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
