import { ActivityIndicator } from 'react-native';
import { Text } from '@rneui/themed';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { ScreenContainer } from '@components/ui';

export type AppStartupColors = {
  background: string;
  primary: string;
  text: string;
  textMuted: string;
};

type AppStartupScreenProps = {
  colors: AppStartupColors;
  isDark: boolean;
};

export function AppStartupScreen({ colors, isDark }: AppStartupScreenProps) {
  return (
    <ScreenContainer centerContent>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ActivityIndicator size="large" color={colors.primary} />
      <Text h3 style={[styles.startupTitle, { color: colors.text }]}>
        Starting Eventinel
      </Text>
      <Text style={[styles.startupSubtitle, { color: colors.textMuted }]}>
        Loading relays and cached incidents...
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  startupTitle: {
    marginTop: 16,
    textAlign: 'center',
  },
  startupSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
