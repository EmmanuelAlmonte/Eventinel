import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from '@rneui/themed';
import type { EdgeInsets } from 'react-native-safe-area-context';

type ThemeColors = {
  background: string;
  error: string;
  primary: string;
  text: string;
  textMuted: string;
};

type IncidentDetailLoadingStateProps = {
  colors: ThemeColors;
  insets: EdgeInsets;
  showNotFound: boolean;
  onBack: () => void;
};

export function IncidentDetailLoadingState({
  colors,
  insets,
  showNotFound,
  onBack,
}: IncidentDetailLoadingStateProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Icon name="chevron-left" type="material" size={28} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
        </Pressable>
      </View>
      <View style={styles.content}>
        {showNotFound ? (
          <>
            <Icon name="error-outline" type="material" size={64} color={colors.error} />
            <Text style={[styles.title, { color: colors.text }]}>Incident not available</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Return to map or feed to find incidents
            </Text>
            <Button title="Go Back" onPress={onBack} />
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Loading incident...</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
