import * as Notifications from 'expo-notifications';

import { useIncidentNotificationHandler } from './useIncidentNotificationHandler';
import { useIncidentNotificationTaps } from './useIncidentNotificationTaps';
import { useIncidentPushRegistration } from './useIncidentPushRegistration';
import { useLiveIncidentToasts } from './useLiveIncidentToasts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function IncidentNotificationBridge() {
  const handleIncidentNotification = useIncidentNotificationHandler();

  useIncidentPushRegistration();
  useIncidentNotificationTaps(handleIncidentNotification);
  useLiveIncidentToasts(handleIncidentNotification);

  return null;
}
