/**
 * ProfileScreen
 *
 * Displays user's Nostr identity, profile info, and logout functionality.
 * Includes theme toggle for light/dark mode.
 */

import { StyleSheet, View, Alert, Platform } from 'react-native';
import { Text, Button, Card, Avatar, Icon, Divider, Switch } from '@rneui/themed';
import { useNDKSessionLogout, useNDKCurrentPubkey, useNDKCurrentUser } from '@nostr-dev-kit/mobile';

import { ScreenContainer } from '../lib/ui';
import { useAppTheme } from '../lib/theme';

export default function ProfileScreen() {
  const logout = useNDKSessionLogout();
  const currentPubkey = useNDKCurrentPubkey();
  const currentUser = useNDKCurrentUser();

  // Get theme-aware colors and toggle
  const { colors, isDark, toggleMode } = useAppTheme();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            if (currentPubkey) {
              logout(currentPubkey);
            }
          },
        },
      ]
    );
  };

  // Get display name from profile if available
  const displayName = currentUser?.profile?.displayName || currentUser?.profile?.name || 'Anonymous';
  const avatarUrl = currentUser?.profile?.image;

  // Truncate pubkey for display
  const truncatedPubkey = currentPubkey
    ? `${currentPubkey.slice(0, 16)}...${currentPubkey.slice(-16)}`
    : '';

  return (
    <ScreenContainer scroll>
      {/* Header */}
      <View style={styles.header}>
        <Text h2 style={[styles.title, { color: colors.text }]}>Profile</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your Nostr identity</Text>
      </View>

      {/* User Info Card */}
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

          {currentUser?.profile?.nip05 && (
            <View style={styles.nip05Container}>
              <Icon
                name="verified"
                type="material"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.nip05Text, { color: colors.primary }]}>{currentUser.profile.nip05}</Text>
            </View>
          )}

          {currentUser?.profile?.about && (
            <Text style={[styles.about, { color: colors.textMuted }]} numberOfLines={3}>
              {currentUser.profile.about}
            </Text>
          )}
        </View>
      </Card>

      {/* Public Key Display */}
      {currentPubkey && (
        <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Icon
              name="key"
              type="material"
              size={20}
              color={colors.primary}
            />
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
      )}

      {/* Appearance Settings */}
      <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Icon
            name="palette"
            type="material"
            size={20}
            color={colors.primary}
          />
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
          <Switch
            value={isDark}
            onValueChange={toggleMode}
          />
        </View>
      </Card>

      {/* Account Actions */}
      <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Icon
            name="settings"
            type="material"
            size={20}
            color={colors.textMuted}
          />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Account</Text>
        </View>

        <Button
          title="Logout"
          onPress={handleLogout}
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

      {/* Info Note */}
      <View style={[styles.infoContainer, { borderColor: `${colors.info}30` }]}>
        <Icon
          name="info-outline"
          type="material"
          size={18}
          color={colors.info}
        />
        <Text style={[styles.infoText, { color: colors.info }]}>
          Your session is securely stored on this device. Logging out will clear your local session.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    margin: 0,
    marginBottom: 16,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatar: {
    marginBottom: 16,
  },
  avatarTitle: {
    fontSize: 36,
    fontWeight: '700',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  nip05Container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  nip05Text: {
    fontSize: 14,
    fontWeight: '500',
  },
  about: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  pubkeyText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pubkeyHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  fullPubkey: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    borderRadius: 8,
    paddingVertical: 12,
  },
  logoutButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
