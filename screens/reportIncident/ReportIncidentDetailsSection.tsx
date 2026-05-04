import { Pressable, StyleSheet, View } from 'react-native';
import { Input, Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { ReportMediaAttachment } from '../../contexts/ReportDraftContext';
import type { ReportIncidentType } from '@lib/navigation';

import type { ReportFormColors } from './reportFormTypes';
import {
  buildReportMediaAttachmentMeta,
  getReportMediaAttachmentTitle,
} from './mediaAttachmentPresentation';

export const MIN_DESCRIPTION_LENGTH = 24;

const REPORT_ACTIVE_OPTIONS = [
  {
    value: true,
    label: 'Still active',
    icon: 'broadcast',
  },
  {
    value: false,
    label: 'No longer active',
    icon: 'check-decagram-outline',
  },
] as const;

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

type ReportIncidentDetailsSectionProps = {
  colors: ReportFormColors;
  incidentType: ReportIncidentType | null;
  stillActive: boolean | null;
  description: string;
  mediaAttachments: readonly ReportMediaAttachment[];
  isUploadingMedia: boolean;
  mediaUploadProgress: number | null;
  mediaUploadError: string | null;
  shouldShowTypeError: boolean;
  shouldShowStillActiveError: boolean;
  shouldShowDescriptionError: boolean;
  onIncidentTypeChange: (value: ReportIncidentType) => void;
  onStillActiveChange: (value: boolean) => void;
  onDescriptionChange: (value: string) => void;
  onDescriptionBlur: () => void;
  onAddMedia: () => void;
  onRemoveMediaAttachment: (attachmentId: string) => void;
};

export function ReportIncidentDetailsSection({
  colors,
  incidentType,
  stillActive,
  description,
  mediaAttachments,
  isUploadingMedia,
  mediaUploadProgress,
  mediaUploadError,
  shouldShowTypeError,
  shouldShowStillActiveError,
  shouldShowDescriptionError,
  onIncidentTypeChange,
  onStillActiveChange,
  onDescriptionChange,
  onDescriptionBlur,
  onAddMedia,
  onRemoveMediaAttachment,
}: ReportIncidentDetailsSectionProps) {
  return (
    <View style={[styles.detailsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.stepLabel, { color: colors.textMuted }]}>Step 2</Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>What happened</Text>
      </View>

      <Text style={[styles.sectionHelper, { color: colors.textMuted }]}>
        Choose the closest report type, then describe what happened, where on the block it is happening, and whether it is still active.
      </Text>

      <ReportTypePicker
        colors={colors}
        incidentType={incidentType}
        onIncidentTypeChange={onIncidentTypeChange}
      />

      {shouldShowTypeError ? (
        <Text style={[styles.validationText, { color: '#F97316' }]}>
          Choose the report type before continuing.
        </Text>
      ) : null}

      <ActiveStatusPicker
        colors={colors}
        stillActive={stillActive}
        onStillActiveChange={onStillActiveChange}
      />

      {shouldShowStillActiveError ? (
        <Text style={[styles.validationText, { color: '#F97316' }]}>
          Choose whether the incident is still active before continuing.
        </Text>
      ) : null}

      <ReportDescriptionInput
        colors={colors}
        description={description}
        onDescriptionChange={onDescriptionChange}
        onDescriptionBlur={onDescriptionBlur}
      />

      {shouldShowDescriptionError ? (
        <Text style={[styles.validationText, { color: '#F97316' }]}>
          Add at least {MIN_DESCRIPTION_LENGTH} characters so the report is specific enough to review.
        </Text>
      ) : null}

      <ReportMediaAttachmentsSection
        colors={colors}
        attachments={mediaAttachments}
        isUploadingMedia={isUploadingMedia}
        mediaUploadProgress={mediaUploadProgress}
        mediaUploadError={mediaUploadError}
        onAddMedia={onAddMedia}
        onRemoveMediaAttachment={onRemoveMediaAttachment}
      />
    </View>
  );
}

function ReportTypePicker({
  colors,
  incidentType,
  onIncidentTypeChange,
}: Pick<ReportIncidentDetailsSectionProps, 'colors' | 'incidentType' | 'onIncidentTypeChange'>) {
  return (
    <View style={styles.typeGrid}>
      {REPORT_TYPE_OPTIONS.map((option) => {
        const isSelected = incidentType === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={`Select ${option.label} report type`}
            onPress={() => onIncidentTypeChange(option.value)}
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
  );
}

function ActiveStatusPicker({
  colors,
  stillActive,
  onStillActiveChange,
}: Pick<ReportIncidentDetailsSectionProps, 'colors' | 'stillActive' | 'onStillActiveChange'>) {
  return (
    <View style={styles.activeStatusSection}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>Is it still active?</Text>
      <View style={styles.activeStatusRow}>
        {REPORT_ACTIVE_OPTIONS.map((option) => {
          const isSelected = stillActive === option.value;

          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityLabel={`Select ${option.label.toLowerCase()} status`}
              onPress={() => onStillActiveChange(option.value)}
              style={({ pressed }) => [
                styles.activeStatusChip,
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
              <Text style={[styles.activeStatusChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ReportDescriptionInput({
  colors,
  description,
  onDescriptionChange,
  onDescriptionBlur,
}: Pick<
  ReportIncidentDetailsSectionProps,
  'colors' | 'description' | 'onDescriptionChange' | 'onDescriptionBlur'
>) {
  return (
    <>
      <Input
        placeholder="Describe what happened"
        value={description}
        onChangeText={onDescriptionChange}
        onBlur={onDescriptionBlur}
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
    </>
  );
}

function ReportMediaAttachmentsSection({
  colors,
  attachments,
  isUploadingMedia,
  mediaUploadProgress,
  mediaUploadError,
  onAddMedia,
  onRemoveMediaAttachment,
}: {
  colors: ReportFormColors;
  attachments: readonly ReportMediaAttachment[];
  isUploadingMedia: boolean;
  mediaUploadProgress: number | null;
  mediaUploadError: string | null;
  onAddMedia: () => void;
  onRemoveMediaAttachment: (attachmentId: string) => void;
}) {
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
            pressed && styles.typeChipPressed,
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
                style={({ pressed }) => [styles.removeMediaButton, pressed && styles.typeChipPressed]}
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
          <Text style={[styles.uploadStatusText, { color: colors.textMuted }]}>
            Uploading media {percent}%
          </Text>
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
  activeStatusSection: {
    marginBottom: 14,
  },
  activeStatusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  activeStatusChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  activeStatusChipText: {
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  validationText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
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
  mediaErrorText: {
    marginTop: 10,
    marginBottom: 0,
  },
});
