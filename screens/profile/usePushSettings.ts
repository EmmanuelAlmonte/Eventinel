import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

import { showToast } from '@components/ui';
import { loadExpoPushToken, saveExpoPushToken } from '@lib/notifications/pushTokenStorage';
import {
  getPushPermissionStatus,
  registerForPushNotificationsAsync,
  requestPushPermissions,
} from '@lib/notifications/pushRegistration';

export function usePushSettings() {
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

  const requestPermission = useCallback(async () => {
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

  const registerPushToken = useCallback(async () => {
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

  return {
    pushToken,
    isLoadingPushToken,
    pushPermissionStatus,
    isRequestingPermission,
    isRegisteringPush,
    requestPermission,
    registerPushToken,
  };
}
