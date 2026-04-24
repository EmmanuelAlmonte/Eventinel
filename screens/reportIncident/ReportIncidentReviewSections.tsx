import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { REPORT_TYPE_LABELS, type ReportIncidentType } from '../../domain/report';
import type { ReportRadiusState } from '../../lib/utils/reportLocationRadius';
import type { ReportFormColors } from './reportFormTypes';
import { ReportLocationPreview } from './ReportLocationPreview';
import type { LocationPresentation } from './locationPresentation';

type ReportReviewLocationSectionProps = {
  colors: ReportFormColors;
  location: { latitude: number; longitude: number } | null;
  locationPresentation: LocationPresentation;
  reportRadiusState: ReportRadiusState;
  onEditLocation: () => void;
};

type ReportReviewSummarySectionProps = {
  colors: ReportFormColors;
  incidentType: ReportIncidentType;
  stillActive: boolean;
  description: string;
  onEditDetails: () => void;
};

export function ReportReviewLocationSection({
  colors,
  location,
  locationPresentation,
  reportRadiusState,
  onEditLocation,
}: ReportReviewLocationSectionProps) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <ReportReviewSectionHeader
        colors={colors}
        title="Location"
        actionLabel="Edit location"
        accessibilityLabel="Edit location"
        onPress={onEditLocation}
      />
      <ReportLocationPreview
        colors={colors}
        location={location}
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
  );
}

export function ReportReviewSummarySection({
  colors,
  incidentType,
  stillActive,
  description,
  onEditDetails,
}: ReportReviewSummarySectionProps) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <ReportReviewSectionHeader
        colors={colors}
        title="Report summary"
        actionLabel="Edit details"
        accessibilityLabel="Edit report details"
        onPress={onEditDetails}
      />
      <View style={styles.typeRow}>
        <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.typeBadgeText}>{REPORT_TYPE_LABELS[incidentType]}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: stillActive ? colors.success : colors.background,
              borderColor: stillActive ? colors.success : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: stillActive ? '#FFFFFF' : colors.text },
            ]}
          >
            {stillActive ? 'Still active' : 'No longer active'}
          </Text>
        </View>
      </View>
      <Text style={[styles.description, { color: colors.text }]}>{description.trim()}</Text>
    </View>
  );
}

export function ReportReviewAttachmentNotice({ colors }: { colors: ReportFormColors }) {
  return (
    <View style={[styles.infoRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <MaterialCommunityIcons name="paperclip" size={16} color={colors.textMuted} />
      <Text style={[styles.infoText, { color: colors.textMuted }]}>
        Photos, links, and any extra follow-up context can be added in a later step.
      </Text>
    </View>
  );
}

function ReportReviewSectionHeader({
  colors,
  title,
  actionLabel,
  accessibilityLabel,
  onPress,
}: {
  colors: ReportFormColors;
  title: string;
  actionLabel: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.editAction, pressed && styles.buttonPressed]}
      >
        <Text style={[styles.editActionText, { color: colors.primary }]}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
