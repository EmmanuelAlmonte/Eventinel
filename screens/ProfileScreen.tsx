/**
 * ProfileScreen
 *
 * Displays identity metadata, app controls, and advanced notification details.
 */

import { useCallback, useMemo } from 'react';
import { Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { useNDKCurrentPubkey, useNDKCurrentUser, useNDKSessionLogout } from '@nostr-dev-kit/mobile';

import { showToast } from '@components/ui';
import { type AppNavigation } from '@lib/navigation';
import { isCashuWalletFeatureEnabled, isLightningWalletFeatureEnabled } from '@lib/featureFlags';
import { automationTestID } from '@lib/utils';
import { ScreenContainer } from '@components/ui';
import { useAppTheme } from '@hooks';

import {
  AppearanceRow,
  IdentityHeroCard,
  NetworkRow,
  NotificationRow,
  permissionLabelFromStatus,
  ProfileHeader,
  ProfileSection,
  PublicKeyRow,
  PushTokenSection,
  SupportSection,
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

  const handleCopyPubkey = useCallback(async () => {
    if (!currentPubkey) {
      return;
    }

    try {
      await Clipboard.setStringAsync(currentPubkey);
      showToast.success('Public key copied');
    } catch (error) {
      console.warn('[Profile] Failed to copy public key:', error);
      showToast.error('Copy failed');
    }
  }, [currentPubkey]);

  const handleShareProfile = useCallback(async () => {
    if (!currentPubkey) {
      return;
    }

    try {
      await Share.share({
        message: `Eventinel profile\nNostr public key: ${currentPubkey}`,
      });
    } catch (error) {
      console.warn('[Profile] Failed to share profile:', error);
      showToast.error('Share failed');
    }
  }, [currentPubkey]);

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
    ? `${currentPubkey.slice(0, 12)}...${currentPubkey.slice(-12)}`
    : '';

  return (
    <ScreenContainer scroll testID={automationTestID('screen-profile')}>
      <ProfileHeader colors={colors} />

      <IdentityHeroCard
        colors={colors}
        displayName={displayName}
        avatarUrl={avatarUrl}
        nip05={currentUser?.profile?.nip05}
        about={currentUser?.profile?.about}
        onCopyPubkey={handleCopyPubkey}
        onShareProfile={handleShareProfile}
        canCopyPubkey={Boolean(currentPubkey)}
        canShareProfile={Boolean(currentPubkey)}
      />

      <ProfileSection
        colors={colors}
        title="Account"
        description="Who you are and how this account connects."
      >
        {currentPubkey ? (
          <PublicKeyRow
            colors={colors}
            truncatedPubkey={truncatedPubkey}
            onCopyPubkey={handleCopyPubkey}
          />
        ) : null}
        {walletSettingsEnabled ? (
          <NetworkRow
            colors={colors}
            title="Wallet"
            description={walletDescription}
            icon="account-balance-wallet"
            onPress={() => navigation.navigate('Wallet')}
            showDivider={Boolean(currentPubkey)}
          />
        ) : null}
        <NetworkRow
          colors={colors}
          title="Relay settings"
          description="Manage Nostr relay connections"
          icon="dns"
          onPress={() => navigation.navigate('Relays')}
          showDivider={Boolean(currentPubkey) || walletSettingsEnabled}
        />
      </ProfileSection>

      <ProfileSection colors={colors} title="App" description="Change how Eventinel behaves on this device.">
        <AppearanceRow colors={colors} isDark={isDark} onToggle={toggleMode} />
        <NotificationRow
          colors={colors}
          permissionLabel={permissionLabel}
          permissionColor={permissionColor}
          isGranted={pushPermissionStatus === Notifications.PermissionStatus.GRANTED}
          onPress={
            pushPermissionStatus === Notifications.PermissionStatus.GRANTED ? undefined : requestPermission
          }
          showDivider
        />
      </ProfileSection>

      <SupportSection colors={colors} onLogout={handleLogout} />

      {__DEV__ ? (
        <PushTokenSection
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
      ) : null}
    </ScreenContainer>
  );
}
