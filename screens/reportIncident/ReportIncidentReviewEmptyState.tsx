import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';

import type { ReportFormColors } from './reportFormTypes';

type ReportIncidentReviewEmptyStateProps = {
  colors: ReportFormColors;
  onBackToReport: () => void;
};

export function ReportIncidentReviewEmptyState({
  colors,
  onBackToReport,
}: ReportIncidentReviewEmptyStateProps) {
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No report draft to review.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to report"
        onPress={onBackToReport}
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

const styles = StyleSheet.create({
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
});
