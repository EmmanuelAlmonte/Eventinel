import { useEffect, useRef } from 'react';

import { saveExpoPushToken } from '@lib/notifications/pushTokenStorage';
import { registerForPushNotificationsAsync } from '@lib/notifications/pushRegistration';

export function useIncidentPushRegistration() {
  const hasRegisteredRef = useRef(false);

  useEffect(() => {
    if (hasRegisteredRef.current) return;
    hasRegisteredRef.current = true;

    registerForPushNotificationsAsync()
      .then((token) => {
        if (!token) return;

        console.log('📨 [Notifications] Expo push token:', token);
        saveExpoPushToken(token).catch((error) => {
          console.warn('[Notifications] Failed to store expo push token:', error);
        });
      })
      .catch((error) => {
        console.warn('[Notifications] Failed to register for push notifications:', error);
      });
  }, []);
}
