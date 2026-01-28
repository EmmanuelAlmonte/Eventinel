import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import { showToast } from '@components/ui';
import { useIncidentCache, useSharedIncidents } from '@contexts';
import type { ProcessedIncident } from '@hooks/useIncidentSubscription';
import type { ParsedIncident } from '@lib/nostr/events/types';
import {
  coerceIncidentNotificationPayload,
  fetchIncidentFromRelay,
  type IncidentNotificationPayload,
} from '@lib/notifications/incidentNotifications';

type RootStackParamList = {
  IncidentDetail: { incidentId: string };
};

const NOTIFICATION_CHANNEL_ID = 'incidents';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Incidents',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    console.warn('[Notifications] Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Push permission not granted');
    return null;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

  if (!projectId) {
    console.warn('[Notifications] EAS projectId not found in app config');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return token;
}

function toProcessedIncident(parsed: ParsedIncident): ProcessedIncident {
  const createdAtMs = parsed.createdAt * 1000;
  const occurredAtMs =
    parsed.occurredAt instanceof Date && !Number.isNaN(parsed.occurredAt.getTime())
      ? parsed.occurredAt.getTime()
      : createdAtMs;

  return {
    ...parsed,
    createdAtMs,
    occurredAtMs,
  };
}

export default function IncidentNotificationBridge() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { incidents, hasReceivedHistory } = useSharedIncidents();
  const { upsertMany, getIncident } = useIncidentCache();
  const appStateRef = useRef(AppState.currentState);
  const hasSeededRef = useRef(false);
  const seenIncidentIdsRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef<Set<string>>(new Set());
  const hasRegisteredRef = useRef(false);

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
          navigation.navigate('IncidentDetail', { incidentId: processed.incidentId });
          return;
        }

        if (payload.incidentId) {
          const cached = getIncident(payload.incidentId);
          if (cached) {
            navigation.navigate('IncidentDetail', { incidentId: cached.incidentId });
            return;
          }
        }

        showToast.error('Incident not found', 'Try again in a moment');
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [getIncident, navigation, upsertMany]
  );

  useEffect(() => {
    if (hasRegisteredRef.current) return;
    hasRegisteredRef.current = true;

    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          console.log('📨 [Notifications] Expo push token:', token);
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
