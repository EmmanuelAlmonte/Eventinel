import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { ReportMediaAttachment } from '../../contexts/ReportDraftContext';
import { REPORT_TYPE_LABELS, type ReportIncidentType } from '../../domain/report';
import type { ReportRadiusState } from '../../lib/utils/reportLocationRadius';
import type { ReportFormColors } from './reportFormTypes';
import { ReportLocationPreview } from './ReportLocationPreview';
import type { LocationPresentation } from './locationPresentation';
import {
  buildReportMediaAttachmentCountLabel,
  buildReportMediaAttachmentMeta,
  getReportMediaAttachmentTitle,
} from './mediaAttachmentPresentation';

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

type ReportReviewMediaSectionProps = {
  colors: ReportFormColors;
  attachments: readonly ReportMediaAttachment[];
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

export function ReportReviewMediaSection({ colors, attachments }: ReportReviewMediaSectionProps) {
  if (attachments.length === 0) {
    return (
      <View style={[styles.infoRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="paperclip" size={16} color={colors.textMuted} />
        <Text style={[styles.infoText, { color: colors.textMuted }]}>No media attached to this report.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Media</Text>
        <Text style={[styles.attachmentCount, { color: colors.textMuted }]}>
          {buildReportMediaAttachmentCountLabel(attachments)}
        </Text>
      </View>
      <View style={styles.attachmentList}>
        {attachments.map((attachment) => (
          <View key={attachment.id} style={[styles.attachmentRow, { borderColor: colors.border }]}>
            <MaterialCommunityIcons
              name={attachment.mediaKind === 'video' ? 'video-outline' : 'image-outline'}
              size={20}
              color={colors.primary}
            />
            <View style={styles.attachmentText}>
              <Text style={[styles.attachmentTitle, { color: colors.text }]}>
                {getReportMediaAttachmentTitle(attachment)}
              </Text>
              <Text style={[styles.attachmentMeta, { color: colors.textMuted }]}>
                {buildReportMediaAttachmentMeta(attachment)}
              </Text>
            </View>
          </View>
        ))}
      </View>
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
  attachmentCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  attachmentList: {
    gap: 10,
  },
  attachmentRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachmentText: {
    flex: 1,
  },
  attachmentTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  attachmentMeta: {
    fontSize: 11,
    lineHeight: 16,
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
