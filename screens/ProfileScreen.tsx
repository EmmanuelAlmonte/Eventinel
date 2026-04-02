/**
 * ProfileScreen
 *
 * Displays identity metadata, appearance settings, and push notification controls.
 */

import { useMemo } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { useNDKCurrentPubkey, useNDKCurrentUser, useNDKSessionLogout } from '@nostr-dev-kit/mobile';

import { type AppNavigation } from '@lib/navigation';
import { isCashuWalletFeatureEnabled, isLightningWalletFeatureEnabled } from '@lib/featureFlags';
import { ScreenContainer } from '@components/ui';
import { useAppTheme } from '@hooks';

import {
  AccountCard,
  AppearanceCard,
  permissionLabelFromStatus,
  ProfileHeader,
  ProfileInfoNote,
  PublicKeyCard,
  PushTokenCard,
  SettingsCard,
  UserInfoCard,
} from './profile/ProfileSections';
import { usePushSettings } from './profile/usePushSettings';

export default function ProfileScreen() {
  const navigation = useNavigation<AppNavigation>();
  const logout = useNDKSessionLogout();
  const currentPubkey = useNDKCurrentPubkey();
  const currentUser = useNDKCurrentUser();
  const { colors, isDark, toggleMode } = useAppTheme();
  const {
    pushToken,
    isLoadingPushToken,
    pushPermissionStatus,
    isRequestingPermission,
    isRegisteringPush,
    requestPermission,
    registerPushToken,
  } = usePushSettings();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
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
    ]);
  };

  const permissionLabel = permissionLabelFromStatus(pushPermissionStatus);
  const lightningEnabled = isLightningWalletFeatureEnabled;
  const cashuEnabled = isCashuWalletFeatureEnabled;
  const walletSettingsEnabled = lightningEnabled || cashuEnabled;
  const walletDescription =
    lightningEnabled && cashuEnabled
      ? 'Lightning (NWC) and Cashu payments'
      : lightningEnabled
        ? 'Lightning (NWC) payments'
        : 'Cashu payments';
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

  const displayName = currentUser?.profile?.displayName || currentUser?.profile?.name || 'Anonymous';
  const avatarUrl = currentUser?.profile?.image;
  const truncatedPubkey = currentPubkey
    ? `${currentPubkey.slice(0, 16)}...${currentPubkey.slice(-16)}`
    : '';

  return (
    <ScreenContainer scroll>
      <ProfileHeader colors={colors} />

      <UserInfoCard
        colors={colors}
        displayName={displayName}
        avatarUrl={avatarUrl}
        nip05={currentUser?.profile?.nip05}
        about={currentUser?.profile?.about}
      />

      {currentPubkey ? (
        <PublicKeyCard
          colors={colors}
          currentPubkey={currentPubkey}
          truncatedPubkey={truncatedPubkey}
        />
      ) : null}

      <AppearanceCard colors={colors} isDark={isDark} onToggle={toggleMode} />

      <SettingsCard
        colors={colors}
        onWalletPress={() => navigation.navigate('Wallet')}
        onRelayPress={() => navigation.navigate('Relays')}
        walletEnabled={walletSettingsEnabled}
        walletDescription={walletDescription}
      />

      <PushTokenCard
        colors={colors}
        permissionLabel={permissionLabel}
        permissionColor={permissionColor}
        isRequestingPermission={isRequestingPermission}
        isRegisteringPush={isRegisteringPush}
        isLoadingPushToken={isLoadingPushToken}
        pushToken={pushToken}
        onRequestPermission={requestPermission}
        onRegisterToken={registerPushToken}
      />

      <AccountCard colors={colors} onLogout={handleLogout} />
      <ProfileInfoNote colors={colors} />
    </ScreenContainer>
  );
}
