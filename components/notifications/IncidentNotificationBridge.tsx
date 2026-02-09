import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

import { showToast } from '@components/ui';
import { useIncidentCacheApi, useSharedIncidents } from '@contexts';
import { toProcessedIncident } from '@hooks/useIncidentSubscription';
import { navigationRef, type RootStackParamList } from '@lib/navigation';
import { saveExpoPushToken } from '@lib/notifications/pushTokenStorage';
import {
  coerceIncidentNotificationPayload,
  fetchIncidentFromRelay,
  type IncidentNotificationPayload,
} from '@lib/notifications/incidentNotifications';
import { registerForPushNotificationsAsync } from '@lib/notifications/pushRegistration';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function IncidentNotificationBridge() {
  const { incidents, hasReceivedHistory } = useSharedIncidents();
  const { upsertMany, getIncident } = useIncidentCacheApi();
  const appStateRef = useRef(AppState.currentState);
  const hasSeededRef = useRef(false);
  const seenIncidentIdsRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef<Set<string>>(new Set());
  const hasRegisteredRef = useRef(false);

  const navigateToIncidentDetail = useCallback(
    (params: RootStackParamList['IncidentDetail']) => {
      if (!navigationRef.isReady()) {
        console.warn('[Notifications] Navigation is not ready; skipping navigate');
        return;
      }

      navigationRef.navigate('IncidentDetail', params);
    },
    []
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  const handleIncidentNotification = useCallback(
    async (payload: IncidentNotificationPayload) => {
      const key = payload.eventId ?? payload.incidentId;
      if (!key || inFlightRef.current.has(key)) return;

      inFlightRef.current.add(key);
      try {
          const parsed = await fetchIncidentFromRelay(payload);
          if (parsed) {
            const processed = toProcessedIncident(parsed);
            upsertMany([processed]);
            navigateToIncidentDetail({
              incidentId: processed.incidentId,
              eventId: processed.eventId,
            });
            return;
          }

          if (payload.incidentId) {
            const cached = getIncident(payload.incidentId);
            if (cached) {
              navigateToIncidentDetail({
                incidentId: cached.incidentId,
                eventId: cached.eventId,
              });
              return;
            }
        }

        showToast.error('Incident not found', 'Try again in a moment');
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [getIncident, navigateToIncidentDetail, upsertMany]
  );

  useEffect(() => {
    if (hasRegisteredRef.current) return;
    hasRegisteredRef.current = true;

    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          console.log('📨 [Notifications] Expo push token:', token);
          saveExpoPushToken(token).catch((error) => {
            console.warn('[Notifications] Failed to store expo push token:', error);
          });
        }
      })
      .catch((error) => {
        console.warn('[Notifications] Failed to register for push notifications:', error);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;

    Notifications.getLastNotificationResponseAsync().then((response: any) => {
      if (!isMounted || !response) return;
      const payload = coerceIncidentNotificationPayload(
        response.notification.request.content.data
      );
      if (payload) {
        handleIncidentNotification(payload);
      }
    });

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response: any) => {
        const payload = coerceIncidentNotificationPayload(
          response.notification.request.content.data
        );
        if (payload) {
          handleIncidentNotification(payload);
        }
      });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [handleIncidentNotification]);

  useEffect(() => {
    if (!hasReceivedHistory) return;

    if (!hasSeededRef.current) {
      incidents.forEach((incident) => {
        seenIncidentIdsRef.current.add(incident.incidentId);
      });
      hasSeededRef.current = true;
      return;
    }

    if (appStateRef.current !== 'active') return;

    const newIncidents = incidents.filter(
      (incident) => !seenIncidentIdsRef.current.has(incident.incidentId)
    );

    if (newIncidents.length === 0) return;

    newIncidents.forEach((incident) => {
      seenIncidentIdsRef.current.add(incident.incidentId);
      showToast.show({
        type: 'info',
        text1: incident.title,
        text2: incident.location.address,
        visibilityTime: 5000,
        onPress: () =>
          handleIncidentNotification({
            incidentId: incident.incidentId,
            eventId: incident.eventId,
          }),
      });
    });
  }, [hasReceivedHistory, incidents, handleIncidentNotification]);

  return null;
}
