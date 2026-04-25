import { View } from 'react-native';
import { Text } from '@rneui/themed';

import { profileScreenStyles as styles } from './styles';
import type { ThemeColors } from './profileSectionTypes';

export function ProfileHeader({ colors }: { colors: ThemeColors }) {
  return (
    <View style={styles.header}>
      <Text h2 style={[styles.title, { color: colors.text }]}>
        Profile
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Manage your identity, connections, and app settings
      </Text>
    </View>
  );
}
