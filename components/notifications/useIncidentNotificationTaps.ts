import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import {
  coerceIncidentNotificationPayload,
  type IncidentNotificationPayload,
} from '@lib/notifications/incidentNotifications';

type IncidentNotificationBridgeResponse = {
  notification: {
    request: {
      content: {
        data?: unknown;
      };
    };
  };
};

function parseNotificationTapPayload(
  response: unknown
): IncidentNotificationPayload | null {
  if (!response || typeof response !== 'object') return null;

  const candidate = response as IncidentNotificationBridgeResponse | null;
  const notification = candidate?.notification;
  if (!notification || typeof notification !== 'object') return null;

  const request = notification.request;
  if (!request || typeof request !== 'object') return null;

  const content = request.content;
  if (!content || typeof content !== 'object') return null;

  return coerceIncidentNotificationPayload(content.data);
}

export function useIncidentNotificationTaps(
  handleIncidentNotification: (payload: IncidentNotificationPayload) => Promise<void>
) {
  useEffect(() => {
    let isMounted = true;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isMounted || !response) return;
      const payload = parseNotificationTapPayload(response);
      if (payload) {
        handleIncidentNotification(payload);
      }
    });

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const payload = parseNotificationTapPayload(response);
        if (payload) {
          handleIncidentNotification(payload);
        }
      });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [handleIncidentNotification]);
}
