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
      <Text h1 style={[styles.title, { color: colors.text }]}>Welcome to Eventinel</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Sign in to continue</Text>
    </View>
  );
}

