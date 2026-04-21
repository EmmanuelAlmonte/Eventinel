import { Pressable, StyleSheet, View } from 'react-native';
import { Input, Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { ReportLocation } from '@lib/navigation';

import { ReportLocationPreview } from './ReportLocationPreview';
import type { LocationPresentation } from './locationPresentation';
import type { ReportFormColors, ReportRadiusState } from './reportFormTypes';

type ReportIncidentLocationSectionProps = {
  colors: ReportFormColors;
  location: ReportLocation | null;
  locationNote: string;
  locationPresentation: LocationPresentation;
  hasLocation: boolean;
  shouldShowMissingLocation: boolean;
  reportRadiusState: ReportRadiusState;
  onAdjustLocation: () => void;
  onLocationNoteChange: (value: string) => void;
};

export function ReportIncidentLocationSection({
  colors,
  location,
  locationNote,
  locationPresentation,
  hasLocation,
  shouldShowMissingLocation,
  reportRadiusState,
  onAdjustLocation,
  onLocationNoteChange,
}: ReportIncidentLocationSectionProps) {
  return (
    <View style={[styles.locationSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.stepLabel, { color: colors.textMuted }]}>Step 1</Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
      </View>

      <ReportLocationPreview
        colors={colors}
        location={location}
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
        onPress={onAdjustLocation}
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
        value={locationNote}
        onChangeText={onLocationNoteChange}
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
  );
}

const styles = StyleSheet.create({
  locationSection: {
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
  validationText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
});
