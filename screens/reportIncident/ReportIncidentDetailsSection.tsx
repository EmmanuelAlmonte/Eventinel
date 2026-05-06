import { Pressable, StyleSheet, View } from 'react-native';
import { Input, Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { ReportMediaAttachment } from '../../contexts/ReportDraftContext';
import type { ReportIncidentType } from '@lib/navigation';

import type { ReportFormColors } from './reportFormTypes';
import { ReportMediaAttachmentsSection } from './ReportMediaAttachmentsSection';
import { ReportTypePicker } from './ReportTypePicker';

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
  typeChipPressed: {
    opacity: 0.92,
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
});
