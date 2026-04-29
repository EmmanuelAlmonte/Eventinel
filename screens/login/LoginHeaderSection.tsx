import { View } from 'react-native';
import { Text } from '@rneui/themed';

import { loginScreenStyles as styles } from './styles';

type ThemeColors = {
  background: string;
  border: string;
  primary: string;
  primaryDark: string;
  surface: string;
  text: string;
  textMuted: string;
  warning: string;
};

type LoginHeaderProps = {
  colors: ThemeColors;
};

export function LoginHeader({ colors }: LoginHeaderProps) {
  return (
    <View style={styles.header}>
      <Text h2 style={[styles.title, { color: colors.text }]}>Sign in to Eventinel</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Choose how you want to sign in. You can switch methods anytime.
      </Text>
    </View>
  );
}
