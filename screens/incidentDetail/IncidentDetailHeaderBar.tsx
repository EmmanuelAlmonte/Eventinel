import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@rneui/themed';
import type { EdgeInsets } from 'react-native-safe-area-context';

type ThemeColors = {
  background: string;
  text: string;
  textMuted: string;
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
    <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Icon name="chevron-left" type="material" size={28} color={colors.text} />
        <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
      </Pressable>

      <View style={styles.headerRight}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={[styles.liveText, { color: colors.textMuted }]}>LIVE</Text>
        </View>
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
    gap: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  shareButton: {
    padding: 4,
  },
});
