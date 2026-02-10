/**
 * ProfileScreen
 *
 * Displays user's Nostr identity, profile info, and logout functionality.
 * Includes theme toggle for light/dark mode.
 */

import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, Alert, Platform, Pressable } from 'react-native';
import { Text, Button, Card, Avatar, Icon, Divider, Switch } from '@rneui/themed';
import { useNDKSessionLogout, useNDKCurrentPubkey, useNDKCurrentUser } from '@nostr-dev-kit/mobile';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

import { ScreenContainer, showToast } from '@components/ui';
import { useAppTheme } from '@hooks';
import { loadExpoPushToken, saveExpoPushToken } from '@lib/notifications/pushTokenStorage';
import {
  getPushPermissionStatus,
  registerForPushNotificationsAsync,
  requestPushPermissions,
} from '@lib/notifications/pushRegistration';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const logout = useNDKSessionLogout();
  const currentPubkey = useNDKCurrentPubkey();
  const currentUser = useNDKCurrentUser();

  // Get theme-aware colors and toggle
  const { colors, isDark, toggleMode } = useAppTheme();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isLoadingPushToken, setIsLoadingPushToken] = useState(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);

  const refreshPushToken = useCallback(async () => {
    setIsLoadingPushToken(true);
    try {
      const token = await loadExpoPushToken();
      setPushToken(token);
    } catch (error) {
      console.warn('[Profile] Failed to load expo push token:', error);
      setPushToken(null);
    } finally {
      setIsLoadingPushToken(false);
    }
  }, []);

  const refreshPermissionStatus = useCallback(async () => {
    try {
      const status = await getPushPermissionStatus();
      setPushPermissionStatus(status);
    } catch (error) {
      console.warn('[Profile] Failed to load notification permissions:', error);
      setPushPermissionStatus(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshPushToken();
      refreshPermissionStatus();
    }, [refreshPermissionStatus, refreshPushToken])
  );

  const handleRelaySettings = () => {
    navigation.navigate('Relays');
  };

  const handleWallet = () => {
    navigation.navigate('Wallet');
  };

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

  const handleRequestPermission = useCallback(async () => {
    if (pushPermissionStatus === Notifications.PermissionStatus.GRANTED) {
      showToast.info('Notifications already enabled');
      return;
    }

    setIsRequestingPermission(true);
    try {
      const status = await requestPushPermissions();
      setPushPermissionStatus(status);
      if (status === Notifications.PermissionStatus.GRANTED) {
        showToast.success('Notifications enabled');
      } else {
        showToast.warning('Notifications disabled', 'You can enable them in system settings.');
      }
    } catch (error) {
      console.warn('[Profile] Failed to request notification permission:', error);
      showToast.error('Permission request failed', 'Please try again');
    } finally {
      setIsRequestingPermission(false);
    }
  }, [pushPermissionStatus]);

  const handleRegisterPushToken = useCallback(async () => {
    setIsRegisteringPush(true);
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await saveExpoPushToken(token);
        setPushToken(token);
        showToast.success('Push token updated');
      } else {
        showToast.warning('Push token unavailable', 'Check notification permission');
      }
    } catch (error) {
      console.warn('[Profile] Failed to register push token:', error);
      showToast.error('Registration failed', 'Please try again');
    } finally {
      setIsRegisteringPush(false);
      refreshPermissionStatus();
    }
  }, [refreshPermissionStatus]);

  const permissionLabel = useMemo(() => {
    if (!pushPermissionStatus) return 'Unknown';
    switch (pushPermissionStatus) {
      case Notifications.PermissionStatus.GRANTED:
        return 'Granted';
      case Notifications.PermissionStatus.DENIED:
        return 'Denied';
      default:
        return 'Undetermined';
    }
  }, [pushPermissionStatus]);

  const permissionColor = useMemo(() => {
    if (!pushPermissionStatus) return colors.textMuted;
    switch (pushPermissionStatus) {
      case Notifications.PermissionStatus.GRANTED:
        return colors.success;
      case Notifications.PermissionStatus.DENIED:
        return colors.error;
      default:
        return colors.warning;
    }
  }, [colors, pushPermissionStatus]);

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

      {/* Settings */}
      <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Icon
            name="settings"
            type="material"
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Settings</Text>
        </View>

        <Pressable
          onPress={handleWallet}
          style={({ pressed }) => [
            styles.settingRow,
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={styles.settingInfo}>
            <Icon
              name="account-balance-wallet"
              type="material"
              size={24}
              color={colors.textMuted}
            />
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Wallet</Text>
              <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                Lightning (NWC) and Cashu payments
              </Text>
            </View>
          </View>
          <Icon
            name="chevron-right"
            type="material"
            size={24}
            color={colors.textMuted}
          />
        </Pressable>

        <Pressable
          onPress={handleRelaySettings}
          style={({ pressed }) => [
            styles.settingRow,
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={styles.settingInfo}>
            <Icon
              name="dns"
              type="material"
              size={24}
              color={colors.textMuted}
            />
            <View style={styles.settingText}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Relay Settings</Text>
              <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                Manage Nostr relay connections
              </Text>
            </View>
          </View>
          <Icon
            name="chevron-right"
            type="material"
            size={24}
            color={colors.textMuted}
          />
        </Pressable>
      </Card>

      {/* Push Token */}
      <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Icon
            name="notifications"
            type="material"
            size={20}
            color={colors.primary}
          />
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
            onPress={handleRequestPermission}
            disabled={isRequestingPermission || isRegisteringPush}
            containerStyle={styles.pushActionButton}
          />
          <Button
            title="Register token"
            onPress={handleRegisterPushToken}
            disabled={isRegisteringPush || isRequestingPermission}
            containerStyle={styles.pushActionButton}
          />
        </View>
        {isLoadingPushToken ? (
          <Text style={[styles.pushTokenHint, { color: colors.textMuted }]}>
            Loading push token...
          </Text>
        ) : pushToken ? (
          <>
            <Text
              style={[styles.pushTokenText, { color: colors.text, backgroundColor: colors.background }]}
              selectable
            >
              {pushToken}
            </Text>
            <Text style={[styles.pushTokenHint, { color: colors.textMuted }]}>
              Tap and hold to copy
            </Text>
          </>
        ) : (
          <Text style={[styles.pushTokenEmpty, { color: colors.textMuted }]}>
            No push token yet. Open the app on a physical device and allow notifications.
          </Text>
        )}
      </Card>

      {/* Account Actions */}
      <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Icon
            name="person"
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
  pushTokenText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: 12,
    borderRadius: 8,
    lineHeight: 16,
  },
  pushTokenHint: {
    fontSize: 12,
    marginTop: 8,
  },
  pushTokenEmpty: {
    fontSize: 12,
    lineHeight: 16,
  },
  pushStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pushStatusLabel: {
    fontSize: 13,
  },
  pushStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pushStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pushStatusValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  pushActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pushActionButton: {
    flex: 1,
  },
});
