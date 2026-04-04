import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@rneui/themed';
import type { EdgeInsets } from 'react-native-safe-area-context';

type ThemeColors = {
  background: string;
  border: string;
  text: string;
};

type IncidentDetailHeaderBarProps = {
  colors: ThemeColors;
  insets: EdgeInsets;
  onBack: () => void;
  onShare: () => void;
};

export function IncidentDetailHeaderBar({
  colors,
  insets,
  onBack,
  onShare,
}: IncidentDetailHeaderBarProps) {
  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 8,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Pressable onPress={onBack} style={styles.backButton}>
        <Icon name="chevron-left" type="material" size={28} color={colors.text} />
        <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
      </Pressable>

      <View style={styles.headerRight}>
        <Pressable onPress={onShare} style={styles.shareButton}>
          <Icon name="share" type="material" size={24} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareButton: {
    padding: 6,
  },
});
