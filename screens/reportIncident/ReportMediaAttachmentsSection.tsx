import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { ReportMediaAttachment } from '../../contexts/ReportDraftContext';
import type { ReportFormColors } from './reportFormTypes';
import {
  buildReportMediaAttachmentMeta,
  getReportMediaAttachmentTitle,
} from './mediaAttachmentPresentation';

type ReportMediaAttachmentsSectionProps = {
  colors: ReportFormColors;
  attachments: readonly ReportMediaAttachment[];
  isUploadingMedia: boolean;
  mediaUploadProgress: number | null;
  mediaUploadError: string | null;
  onAddMedia: () => void;
  onRemoveMediaAttachment: (attachmentId: string) => void;
};

export function ReportMediaAttachmentsSection({
  colors,
  attachments,
  isUploadingMedia,
  mediaUploadProgress,
  mediaUploadError,
  onAddMedia,
  onRemoveMediaAttachment,
}: ReportMediaAttachmentsSectionProps) {
  const percent = mediaUploadProgress === null ? 0 : Math.round(Math.max(0, Math.min(1, mediaUploadProgress)) * 100);

  return (
    <View style={styles.mediaSection}>
      <View style={styles.mediaHeaderRow}>
        <Text style={[styles.fieldLabel, styles.mediaLabel, { color: colors.text }]}>Media</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add report media"
          accessibilityState={{ disabled: isUploadingMedia }}
          disabled={isUploadingMedia}
          onPress={onAddMedia}
          style={({ pressed }) => [
            styles.addMediaButton,
            { backgroundColor: colors.background, borderColor: colors.border },
            pressed && styles.pressed,
            isUploadingMedia && styles.disabledButton,
          ]}
        >
          <MaterialCommunityIcons name="image-plus" size={16} color={colors.text} />
          <Text style={[styles.addMediaText, { color: colors.text }]}>
            {isUploadingMedia ? 'Uploading' : 'Add media'}
          </Text>
        </Pressable>
      </View>

      {attachments.length === 0 ? (
        <Text style={[styles.mediaEmptyText, { color: colors.textMuted }]}>No media attached yet.</Text>
      ) : (
        <View style={styles.mediaAttachmentList}>
          {attachments.map((attachment) => (
            <View key={attachment.id} style={[styles.mediaAttachmentRow, { borderColor: colors.border }]}>
              <MaterialCommunityIcons
                name={attachment.mediaKind === 'video' ? 'video-outline' : 'image-outline'}
                size={20}
                color={colors.primary}
              />
              <View style={styles.mediaAttachmentText}>
                <Text style={[styles.mediaAttachmentTitle, { color: colors.text }]}>
                  {getReportMediaAttachmentTitle(attachment)}
                </Text>
                <Text style={[styles.mediaAttachmentMeta, { color: colors.textMuted }]}>
                  {buildReportMediaAttachmentMeta(attachment)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${getReportMediaAttachmentTitle(attachment).toLowerCase()}`}
                onPress={() => onRemoveMediaAttachment(attachment.id)}
                style={({ pressed }) => [styles.removeMediaButton, pressed && styles.pressed]}
              >
                <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {isUploadingMedia ? (
        <View style={styles.uploadStatus}>
          <View style={[styles.uploadTrack, { backgroundColor: colors.background }]}>
            <View style={[styles.uploadFill, { width: `${percent}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.uploadStatusText, { color: colors.textMuted }]}>Uploading media {percent}%</Text>
        </View>
      ) : null}

      {mediaUploadError ? (
        <Text style={[styles.validationText, styles.mediaErrorText, { color: '#F97316' }]}>
          {mediaUploadError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mediaSection: {
    marginTop: 16,
  },
  mediaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  mediaLabel: {
    marginBottom: 0,
  },
  addMediaButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addMediaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.92,
  },
  disabledButton: {
    opacity: 0.65,
  },
  mediaEmptyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  mediaAttachmentList: {
    gap: 10,
  },
  mediaAttachmentRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mediaAttachmentText: {
    flex: 1,
  },
  mediaAttachmentTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  mediaAttachmentMeta: {
    fontSize: 11,
    lineHeight: 16,
  },
  removeMediaButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadStatus: {
    marginTop: 10,
  },
  uploadTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  uploadFill: {
    height: 6,
    borderRadius: 999,
  },
  uploadStatusText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  validationText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  mediaErrorText: {
    marginTop: 10,
    marginBottom: 0,
  },
});
