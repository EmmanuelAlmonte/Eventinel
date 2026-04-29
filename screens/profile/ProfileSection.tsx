import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@rneui/themed';

import { profileScreenStyles as styles } from './styles';
import type { ThemeColors } from './profileSectionTypes';

type ProfileSectionProps = {
  colors: ThemeColors;
  title: string;
  description: string;
  children: ReactNode;
};

export function ProfileSection({ colors, title, description, children }: ProfileSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>{description}</Text>
      </View>
      <View style={[styles.sectionGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}
