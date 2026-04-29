import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';

import type { LocationPresentation } from './locationPresentation';
import type { ReportFormColors, ReportRadiusState } from './reportFormTypes';

type ReportAdjustLocationSheetProps = {
  colors: ReportFormColors;
  bottomInset: number;
  locationPresentation: LocationPresentation;
  reportRadiusState: ReportRadiusState;
  distanceLabel: string;
  hasCurrentDeviceLocation: boolean;
  canSaveLocation: boolean;
  onCancel: () => void;
  onSaveLocation: () => void;
  onRetryLocation: () => void;
};

export function ReportAdjustLocationSheet({
  colors,
  bottomInset,
  locationPresentation,
  reportRadiusState,
  distanceLabel,
  hasCurrentDeviceLocation,
  canSaveLocation,
  onCancel,
  onSaveLocation,
  onRetryLocation,
}: ReportAdjustLocationSheetProps) {
  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          paddingBottom: Math.max(bottomInset, 16),
        },
      ]}
    >
      <Text style={[styles.sheetTitle, { color: colors.text }]}>{locationPresentation.primary}</Text>
      <Text style={[styles.sheetBody, { color: colors.textMuted }]}>{locationPresentation.secondary}</Text>
      {locationPresentation.note ? (
        <Text style={[styles.sheetDetail, { color: colors.textMuted }]}>Detail: {locationPresentation.note}</Text>
      ) : null}
      {locationPresentation.tertiary ? (
        <Text style={[styles.sheetMeta, { color: colors.textMuted }]}>{locationPresentation.tertiary}</Text>
      ) : null}

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Current location</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Report pin</Text>
        </View>
      </View>

      <Text style={[styles.distanceText, { color: colors.textMuted }]}>{distanceLabel}</Text>
      <Text style={[styles.statusText, { color: reportRadiusState.isWithinRadius ? colors.success : colors.warning }]}>
        {reportRadiusState.message}
      </Text>

      {!hasCurrentDeviceLocation ? (
        <Text style={[styles.blockedText, { color: colors.textMuted }]}>
          Current location is needed to keep reports local. Turn on location access or retry.
        </Text>
      ) : null}

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel location adjustment"
          onPress={onCancel}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
        </Pressable>

        {hasCurrentDeviceLocation ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save adjusted location"
            onPress={onSaveLocation}
            disabled={!canSaveLocation}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: canSaveLocation ? colors.primary : colors.background,
                borderColor: canSaveLocation ? colors.primary : colors.border,
              },
              pressed && canSaveLocation && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.primaryButtonText, { color: canSaveLocation ? '#FFFFFF' : colors.textMuted }]}>
              Save location
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry current location"
            onPress={onRetryLocation}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Retry location</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  sheetDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
  sheetMeta: {
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.72,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    lineHeight: 18,
  },
  distanceText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  blockedText: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
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
