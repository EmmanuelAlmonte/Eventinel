import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Avatar, Button, Card, Icon, Switch, Text } from '@rneui/themed';
import * as Notifications from 'expo-notifications';

import { profileScreenStyles as styles } from './styles';

type ThemeColors = {
  background: string;
  border: string;
  error: string;
  info: string;
  primary: string;
  success: string;
  surface: string;
  text: string;
  textMuted: string;
  warning: string;
};

type HeroActionButtonProps = {
  colors: ThemeColors;
  icon: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
  variant: 'primary' | 'secondary';
};

function HeroActionButton({
  colors,
  icon,
  label,
  onPress,
  disabled,
  variant,
}: HeroActionButtonProps) {
  const isPrimary = variant === 'primary';
  const iconColor = disabled ? colors.textMuted : isPrimary ? '#FFFFFF' : colors.text;
  const labelColor = disabled ? colors.textMuted : isPrimary ? '#FFFFFF' : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.heroActionButton,
        styles.heroAction,
        isPrimary
          ? [styles.heroActionPrimary, { backgroundColor: colors.primary }]
          : [
              styles.heroActionSecondary,
              {
                backgroundColor: colors.background,
                borderColor: disabled ? colors.border : colors.primary,
              },
            ],
        pressed && !disabled && (isPrimary ? styles.heroActionPrimaryPressed : styles.heroActionSecondaryPressed),
        disabled && (isPrimary ? styles.heroActionPrimaryDisabled : styles.heroActionSecondaryDisabled),
      ]}
    >
      <View style={styles.heroActionContent}>
        <Icon name={icon} type="material" size={18} color={iconColor} />
        <Text
          style={[
            styles.heroActionLabel,
            isPrimary ? styles.heroActionPrimaryText : styles.heroActionSecondaryText,
            { color: labelColor },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

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

type IdentityHeroCardProps = {
  colors: ThemeColors;
  displayName: string;
  avatarUrl?: string;
  nip05?: string;
  about?: string;
  onCopyPubkey: () => void;
  onShareProfile: () => void;
  canCopyPubkey: boolean;
  canShareProfile: boolean;
};

export function IdentityHeroCard({
  colors,
  displayName,
  avatarUrl,
  nip05,
  about,
  onCopyPubkey,
  onShareProfile,
  canCopyPubkey,
  canShareProfile,
}: IdentityHeroCardProps) {
  return (
    <Card containerStyle={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.heroTopRow}>
        {avatarUrl ? (
          <Avatar
            size={88}
            rounded
            source={{ uri: avatarUrl }}
            containerStyle={[styles.avatar, { backgroundColor: colors.primary }]}
          />
        ) : (
          <Avatar
            size={88}
            rounded
            title={displayName.charAt(0).toUpperCase()}
            containerStyle={[styles.avatar, { backgroundColor: colors.primary }]}
            titleStyle={styles.avatarTitle}
          />
        )}

        <View style={styles.heroIdentity}>
          <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.primary }]}>Nostr identity</Text>

          {nip05 && (
            <View style={styles.nip05Container}>
              <Icon name="verified" type="material" size={16} color={colors.primary} />
              <Text style={[styles.nip05Text, { color: colors.primary }]}>{nip05}</Text>
            </View>
          )}
        </View>
      </View>

      {about ? (
        <Text style={[styles.about, { color: colors.textMuted }]} numberOfLines={3}>
          {about}
        </Text>
      ) : null}

      <View style={styles.heroActions}>
        <HeroActionButton
          colors={colors}
          icon="content-copy"
          label="Copy key"
          onPress={onCopyPubkey}
          disabled={!canCopyPubkey}
          variant="secondary"
        />
        <HeroActionButton
          colors={colors}
          icon="share"
          label="Share profile"
          onPress={onShareProfile}
          disabled={!canShareProfile}
          variant="primary"
        />
      </View>
    </Card>
  );
}

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

type PushTokenSectionProps = {
  colors: ThemeColors;
  permissionLabel: string;
  permissionColor: string;
  isRequestingPermission: boolean;
  isRegisteringPush: boolean;
  isLoadingPushToken: boolean;
  pushToken: string | null;
  onRequestPermission: () => void;
  onRegisterToken: () => void;
};

export function PushTokenSection({
  colors,
  permissionLabel,
  permissionColor,
  isRequestingPermission,
  isRegisteringPush,
  isLoadingPushToken,
  pushToken,
  onRequestPermission,
  onRegisterToken,
}: PushTokenSectionProps) {
  return (
    <ProfileSection
      colors={colors}
      title="Advanced"
      description="Technical notification details and device registration."
    >
      <ProfileRow
        colors={colors}
        icon="notifications"
        title="Push notifications"
        description="Registration and delivery status"
        rightContent={
          <View style={[styles.statusBadge, { borderColor: permissionColor }]}>
            <View style={[styles.statusDot, { backgroundColor: permissionColor }]} />
            <Text style={[styles.statusText, { color: permissionColor }]}>{permissionLabel}</Text>
          </View>
        }
      />

      <View style={[styles.advancedBody, { borderTopColor: colors.border }]}>
        <View style={styles.advancedActions}>
          <HeroActionButton
            colors={colors}
            icon="notifications-active"
            label="Request permission"
            onPress={onRequestPermission}
            disabled={isRequestingPermission || isRegisteringPush}
            variant="secondary"
          />
          <HeroActionButton
            colors={colors}
            icon="cloud-upload"
            label="Register token"
            onPress={onRegisterToken}
            disabled={isRegisteringPush || isRequestingPermission}
            variant="primary"
          />
        </View>

        {isLoadingPushToken ? (
          <Text style={[styles.advancedHint, { color: colors.textMuted }]}>Loading push token...</Text>
        ) : pushToken ? (
          <>
            <Text style={[styles.advancedToken, { color: colors.text, backgroundColor: colors.background }]} selectable>
              {pushToken}
            </Text>
            <Text style={[styles.advancedHint, { color: colors.textMuted }]}>Tap and hold to copy</Text>
          </>
        ) : (
          <Text style={[styles.advancedEmpty, { color: colors.textMuted }]}>
            No push token yet. Open the app on a physical device and allow notifications.
          </Text>
        )}
      </View>
    </ProfileSection>
  );
}

type SupportSectionProps = {
  colors: ThemeColors;
  onLogout: () => void;
};

export function SupportSection({ colors, onLogout }: SupportSectionProps) {
  return (
    <ProfileSection colors={colors} title="Support" description="Session and device controls.">
      <ProfileRow
        colors={colors}
        icon="logout"
        title="Logout"
        description="Clear the local session from this device"
        onPress={onLogout}
        danger
      />
    </ProfileSection>
  );
}

export function permissionLabelFromStatus(status: Notifications.PermissionStatus | null): string {
  if (!status) return 'Unknown';
  switch (status) {
    case Notifications.PermissionStatus.GRANTED:
      return 'Granted';
    case Notifications.PermissionStatus.DENIED:
      return 'Denied';
    default:
      return 'Undetermined';
  }
}
