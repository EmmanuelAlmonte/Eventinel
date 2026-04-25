import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Icon, Switch, Text } from '@rneui/themed';

import { profileScreenStyles as styles } from './styles';
import type { ThemeColors } from './profileSectionTypes';

type ProfileRowProps = {
  colors: ThemeColors;
  icon: string;
  iconType?: string;
  title: string;
  description?: string;
  onPress?: () => void;
  rightContent?: ReactNode;
  danger?: boolean;
  showDivider?: boolean;
};

export function ProfileRow({
  colors,
  icon,
  iconType = 'material',
  title,
  description,
  onPress,
  rightContent,
  danger = false,
  showDivider = false,
}: ProfileRowProps) {
  const content = (
    <>
      <View style={styles.rowInfo}>
        <Icon name={icon} type={iconType} size={22} color={danger ? colors.error : colors.textMuted} />
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: danger ? colors.error : colors.text }]}>{title}</Text>
          {description ? (
            <Text style={[styles.rowDescription, { color: colors.textMuted }]} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      {rightContent ?? (onPress ? <Icon name="chevron-right" type="material" size={22} color={colors.textMuted} /> : null)}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          showDivider && [styles.rowDivider, { borderTopColor: colors.border }],
          pressed && styles.rowPressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.row,
        showDivider && [styles.rowDivider, { borderTopColor: colors.border }],
      ]}
    >
      {content}
    </View>
  );
}

type PublicKeyRowProps = {
  colors: ThemeColors;
  truncatedPubkey: string;
  onCopyPubkey: () => void;
  showDivider?: boolean;
};

export function PublicKeyRow({
  colors,
  truncatedPubkey,
  onCopyPubkey,
  showDivider = false,
}: PublicKeyRowProps) {
  return (
    <ProfileRow
      colors={colors}
      icon="key"
      title="Public key"
      description={truncatedPubkey}
      onPress={onCopyPubkey}
      showDivider={showDivider}
      rightContent={
        <View style={styles.rowPill}>
          <Icon name="content-copy" type="material" size={16} color={colors.primary} />
          <Text style={[styles.rowPillText, { color: colors.primary }]}>Copy</Text>
        </View>
      }
    />
  );
}

type AppearanceRowProps = {
  colors: ThemeColors;
  isDark: boolean;
  onToggle: () => void;
  showDivider?: boolean;
};

export function AppearanceRow({ colors, isDark, onToggle, showDivider = false }: AppearanceRowProps) {
  return (
    <ProfileRow
      colors={colors}
      icon={isDark ? 'dark-mode' : 'light-mode'}
      title="Appearance"
      description={isDark ? 'Currently using dark theme' : 'Currently using light theme'}
      showDivider={showDivider}
      rightContent={
        <Switch
          value={isDark}
          onValueChange={onToggle}
          trackColor={{ false: `${colors.textMuted}55`, true: `${colors.primary}66` }}
          thumbColor={isDark ? colors.primary : '#F4F4F5'}
        />
      }
    />
  );
}

type NetworkRowProps = {
  colors: ThemeColors;
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  showDivider?: boolean;
};

export function NetworkRow({
  colors,
  title,
  description,
  icon,
  onPress,
  showDivider = false,
}: NetworkRowProps) {
  return (
    <ProfileRow
      colors={colors}
      icon={icon}
      title={title}
      description={description}
      onPress={onPress}
      showDivider={showDivider}
    />
  );
}

type NotificationRowProps = {
  colors: ThemeColors;
  permissionLabel: string;
  permissionColor: string;
  isGranted: boolean;
  onPress?: () => void;
  showDivider?: boolean;
};

export function NotificationRow({
  colors,
  permissionLabel,
  permissionColor,
  isGranted,
  onPress,
  showDivider = false,
}: NotificationRowProps) {
  return (
    <ProfileRow
      colors={colors}
      icon="notifications"
      title="Notifications"
      description={
        isGranted ? 'Alerts are enabled on this device' : 'Enable notifications to receive nearby alerts'
      }
      onPress={onPress}
      showDivider={showDivider}
      rightContent={
        <View style={[styles.statusBadge, { borderColor: permissionColor }]}>
          <View style={[styles.statusDot, { backgroundColor: permissionColor }]} />
          <Text style={[styles.statusText, { color: permissionColor }]}>{permissionLabel}</Text>
        </View>
      }
    />
  );
}
