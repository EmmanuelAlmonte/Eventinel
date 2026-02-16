import { Pressable, View } from 'react-native';
import { Avatar, Button, Card, Divider, Icon, Switch, Text } from '@rneui/themed';
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
};

export function ProfileHeader({ colors }: { colors: ThemeColors }) {
  return (
    <View style={styles.header}>
      <Text h2 style={[styles.title, { color: colors.text }]}>Profile</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your Nostr identity</Text>
    </View>
  );
}

type UserInfoCardProps = {
  colors: ThemeColors;
  displayName: string;
  avatarUrl?: string;
  nip05?: string;
  about?: string;
};

export function UserInfoCard({
  colors,
  displayName,
  avatarUrl,
  nip05,
  about,
}: UserInfoCardProps) {
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.profileSection}>
        {avatarUrl ? (
          <Avatar
            size={96}
            rounded
            source={{ uri: avatarUrl }}
            containerStyle={[styles.avatar, { backgroundColor: colors.primary }]}
          />
        ) : (
          <Avatar
            size={96}
            rounded
            title={displayName.charAt(0).toUpperCase()}
            containerStyle={[styles.avatar, { backgroundColor: colors.primary }]}
            titleStyle={styles.avatarTitle}
          />
        )}

        <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>

        {nip05 && (
          <View style={styles.nip05Container}>
            <Icon name="verified" type="material" size={16} color={colors.primary} />
            <Text style={[styles.nip05Text, { color: colors.primary }]}>{nip05}</Text>
          </View>
        )}

        {about && (
          <Text style={[styles.about, { color: colors.textMuted }]} numberOfLines={3}>
            {about}
          </Text>
        )}
      </View>
    </Card>
  );
}

type PublicKeyCardProps = {
  colors: ThemeColors;
  currentPubkey: string;
  truncatedPubkey: string;
};

export function PublicKeyCard({ colors, currentPubkey, truncatedPubkey }: PublicKeyCardProps) {
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="key" type="material" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Public Key</Text>
      </View>
      <Text style={[styles.pubkeyText, { color: colors.text, backgroundColor: colors.background }]} selectable>
        {truncatedPubkey}
      </Text>
      <Text style={[styles.pubkeyHint, { color: colors.textMuted }]}>Tap and hold to copy full key</Text>

      <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

      <Text style={[styles.fullPubkey, { color: colors.textMuted }]} selectable numberOfLines={2}>
        {currentPubkey}
      </Text>
    </Card>
  );
}

type AppearanceCardProps = {
  colors: ThemeColors;
  isDark: boolean;
  onToggle: () => void;
};

export function AppearanceCard({ colors, isDark, onToggle }: AppearanceCardProps) {
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="palette" type="material" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Appearance</Text>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon
            name={isDark ? 'dark-mode' : 'light-mode'}
            type="material"
            size={24}
            color={colors.textMuted}
          />
          <View style={styles.settingText}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
              {isDark ? 'Currently using dark theme' : 'Currently using light theme'}
            </Text>
          </View>
        </View>
        <Switch value={isDark} onValueChange={onToggle} />
      </View>
    </Card>
  );
}

type SettingsCardProps = {
  colors: ThemeColors;
  onWalletPress: () => void;
  onRelayPress: () => void;
};

export function SettingsCard({ colors, onWalletPress, onRelayPress }: SettingsCardProps) {
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="settings" type="material" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <Pressable
        onPress={onWalletPress}
        style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
      >
        <View style={styles.settingInfo}>
          <Icon name="account-balance-wallet" type="material" size={24} color={colors.textMuted} />
          <View style={styles.settingText}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Wallet</Text>
            <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
              Lightning (NWC) and Cashu payments
            </Text>
          </View>
        </View>
        <Icon name="chevron-right" type="material" size={24} color={colors.textMuted} />
      </Pressable>

      <Pressable
        onPress={onRelayPress}
        style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
      >
        <View style={styles.settingInfo}>
          <Icon name="dns" type="material" size={24} color={colors.textMuted} />
          <View style={styles.settingText}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Relay Settings</Text>
            <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
              Manage Nostr relay connections
            </Text>
          </View>
        </View>
        <Icon name="chevron-right" type="material" size={24} color={colors.textMuted} />
      </Pressable>
    </Card>
  );
}

type PushTokenCardProps = {
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

export function PushTokenCard({
  colors,
  permissionLabel,
  permissionColor,
  isRequestingPermission,
  isRegisteringPush,
  isLoadingPushToken,
  pushToken,
  onRequestPermission,
  onRegisterToken,
}: PushTokenCardProps) {
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="notifications" type="material" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Push Token</Text>
      </View>
      <View style={styles.pushStatusRow}>
        <Text style={[styles.pushStatusLabel, { color: colors.textMuted }]}>Permission</Text>
        <View style={[styles.pushStatusBadge, { borderColor: permissionColor }]}>
          <View style={[styles.pushStatusDot, { backgroundColor: permissionColor }]} />
          <Text style={[styles.pushStatusValue, { color: permissionColor }]}>{permissionLabel}</Text>
        </View>
      </View>
      <View style={styles.pushActions}>
        <Button
          title="Request permission"
          type="outline"
          onPress={onRequestPermission}
          disabled={isRequestingPermission || isRegisteringPush}
          containerStyle={styles.pushActionButton}
        />
        <Button
          title="Register token"
          onPress={onRegisterToken}
          disabled={isRegisteringPush || isRequestingPermission}
          containerStyle={styles.pushActionButton}
        />
      </View>
      {isLoadingPushToken ? (
        <Text style={[styles.pushTokenHint, { color: colors.textMuted }]}>Loading push token...</Text>
      ) : pushToken ? (
        <>
          <Text
            style={[styles.pushTokenText, { color: colors.text, backgroundColor: colors.background }]}
            selectable
          >
            {pushToken}
          </Text>
          <Text style={[styles.pushTokenHint, { color: colors.textMuted }]}>Tap and hold to copy</Text>
        </>
      ) : (
        <Text style={[styles.pushTokenEmpty, { color: colors.textMuted }]}>
          No push token yet. Open the app on a physical device and allow notifications.
        </Text>
      )}
    </Card>
  );
}

type AccountCardProps = {
  colors: ThemeColors;
  onLogout: () => void;
};

export function AccountCard({ colors, onLogout }: AccountCardProps) {
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="person" type="material" size={20} color={colors.textMuted} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Account</Text>
      </View>
      <Button
        title="Logout"
        onPress={onLogout}
        buttonStyle={[styles.logoutButton, { backgroundColor: colors.error }]}
        titleStyle={styles.logoutButtonText}
        icon={
          <Icon
            name="logout"
            type="material"
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
        }
      />
    </Card>
  );
}

export function ProfileInfoNote({ colors }: { colors: ThemeColors }) {
  return (
    <View style={[styles.infoContainer, { borderColor: `${colors.info}30` }]}>
      <Icon name="info-outline" type="material" size={18} color={colors.info} />
      <Text style={[styles.infoText, { color: colors.info }]}>
        Your session is securely stored on this device. Logging out will clear your local session.
      </Text>
    </View>
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
