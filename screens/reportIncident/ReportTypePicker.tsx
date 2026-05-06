import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { ReportIncidentType } from '@lib/navigation';

import type { ReportFormColors } from './reportFormTypes';

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

type ReportTypePickerProps = {
  colors: ReportFormColors;
  incidentType: ReportIncidentType | null;
  onIncidentTypeChange: (value: ReportIncidentType) => void;
};

export function ReportTypePicker({
  colors,
  incidentType,
  onIncidentTypeChange,
}: ReportTypePickerProps) {
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

const styles = StyleSheet.create({
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
});
