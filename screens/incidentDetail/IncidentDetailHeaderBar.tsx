import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@rneui/themed';
import type { EdgeInsets } from 'react-native-safe-area-context';

type ThemeColors = {
  background: string;
  border: string;
  text: string;
  textMuted: string;
};

type IncidentDetailHeaderBarProps = {
  colors: ThemeColors;
  insets: EdgeInsets;
  onBack: () => void;
  onRightAction: () => void;
  rightActionIcon?: string;
  rightActionLabel?: string;
  overlay?: boolean;
};

export function IncidentDetailHeaderBar({
  colors,
  insets,
  onBack,
  onRightAction,
  rightActionIcon = 'share',
  rightActionLabel = 'Share incident',
  overlay = false,
}: IncidentDetailHeaderBarProps) {
  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 10,
          backgroundColor: overlay ? 'transparent' : colors.background,
          borderBottomColor: colors.border,
        },
        overlay && styles.headerOverlay,
      ]}
    >
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={[
          styles.iconButton,
          overlay && styles.overlayButton,
          {
            backgroundColor: overlay ? 'rgba(10, 16, 28, 0.78)' : colors.background,
            borderColor: overlay ? 'rgba(255,255,255,0.12)' : colors.border,
          },
        ]}
      >
        <Icon name="chevron-left" type="material" size={24} color={colors.text} />
      </Pressable>

      <View style={styles.headerCenter}>
        <Text
          style={[
            styles.headerEyebrow,
            { color: overlay ? 'rgba(255,255,255,0.78)' : colors.textMuted },
          ]}
        >
          Incident
        </Text>
      </View>

      <View style={styles.headerRight}>
        <Pressable
          onPress={onRightAction}
          accessibilityRole="button"
          accessibilityLabel={rightActionLabel}
          style={[
            styles.iconButton,
            overlay && styles.overlayButton,
            {
              backgroundColor: overlay ? 'rgba(10, 16, 28, 0.78)' : colors.background,
              borderColor: overlay ? 'rgba(255,255,255,0.12)' : colors.border,
            },
          ]}
        >
          <Icon name={rightActionIcon} type="material" size={20} color={colors.text} />
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    borderBottomWidth: 0,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayButton: {
    shadowColor: '#000000',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerEyebrow: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
