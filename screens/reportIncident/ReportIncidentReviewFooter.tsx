import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';

import type { ReportRadiusState } from '../../lib/utils/reportLocationRadius';
import type { ReportFormColors } from './reportFormTypes';

type ReportIncidentReviewFooterProps = {
  colors: ReportFormColors;
  bottomInset: number;
  reportRadiusState: ReportRadiusState;
  connectedRelayCount: number;
  stillActive: boolean | null;
  returnLabel: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
};

export function ReportIncidentReviewFooter({
  colors,
  bottomInset,
  reportRadiusState,
  connectedRelayCount,
  stillActive,
  returnLabel,
  isSubmitting,
  canSubmit,
  onSubmit,
}: ReportIncidentReviewFooterProps) {
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
        {buildFooterMessage({
          reportRadiusState,
          connectedRelayCount,
          stillActive,
          returnLabel,
        })}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Submit report"
        onPress={onSubmit}
        disabled={!canSubmit}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: canSubmit ? colors.primary : colors.surface,
            borderColor: canSubmit ? colors.primary : colors.border,
          },
          pressed && canSubmit && styles.buttonPressed,
        ]}
      >
        <Text
          style={[
            styles.primaryButtonText,
            { color: canSubmit ? '#FFFFFF' : colors.textMuted },
          ]}
        >
          {isSubmitting ? 'Submitting…' : 'Submit report'}
        </Text>
      </Pressable>
    </View>
  );
}

function buildFooterMessage({
  reportRadiusState,
  connectedRelayCount,
  stillActive,
  returnLabel,
}: Pick<
  ReportIncidentReviewFooterProps,
  'reportRadiusState' | 'connectedRelayCount' | 'stillActive' | 'returnLabel'
>) {
  if (!reportRadiusState.isWithinRadius) {
    return reportRadiusState.message;
  }

  if (stillActive === null) {
    return 'Choose whether the incident is still active before submitting.';
  }

  if (connectedRelayCount > 0) {
    return `Ready to publish to ${connectedRelayCount} connected relay${connectedRelayCount === 1 ? '' : 's'}.`;
  }

  return `Connect a relay to submit. ${returnLabel} is available after send.`;
}

const styles = StyleSheet.create({
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
