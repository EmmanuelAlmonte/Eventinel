import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';

import type { ReportIncidentType } from '@lib/navigation';

import type { ReportFormColors, ReportRadiusState } from './reportFormTypes';

type ReportIncidentFooterProps = {
  colors: ReportFormColors;
  bottomInset: number;
  canContinue: boolean;
  hasLocation: boolean;
  incidentType: ReportIncidentType | null;
  stillActive: boolean | null;
  reportRadiusState: ReportRadiusState;
  onContinue: () => void;
};

export function ReportIncidentFooter({
  colors,
  bottomInset,
  canContinue,
  hasLocation,
  incidentType,
  stillActive,
  reportRadiusState,
  onContinue,
}: ReportIncidentFooterProps) {
  const footerMessage = !canContinue
    ? !hasLocation
      ? 'Location is still needed before this report can move to review.'
      : !reportRadiusState.isWithinRadius
        ? reportRadiusState.message
        : !incidentType
          ? 'Choose a report type to continue.'
          : stillActive === null
            ? 'Choose whether the incident is still active to continue.'
            : 'Add a fuller description to continue.'
    : 'Continue to review the report before anything is sent.';

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(bottomInset, 16),
        },
      ]}
    >
      <Text style={[styles.footerMessage, { color: colors.textMuted }]}>
        {footerMessage}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue to report review"
        onPress={onContinue}
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
  );
}

const styles = StyleSheet.create({
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
