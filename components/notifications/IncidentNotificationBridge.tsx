import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

import { showToast } from '@components/ui';
import { useIncidentCacheApi, useSharedIncidents } from '@contexts';
import type { ProcessedIncident } from '@hooks';
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

type IncidentNotificationBridgeResponse = {
  notification: {
    request: {
      content: {
        data?: unknown;
      };
    };
  };
};

type ToastableIncident = {
  incidentId: string;
  eventId: string;
  title: string;
  createdAtMs: number;
  severity: ProcessedIncident['severity'];
  type: ProcessedIncident['type'];
  location: {
    address: string;
  };
};

type KnownIncidentSnapshot = {
  incidentId: string;
  eventId: string;
  severity: ProcessedIncident['severity'];
  type: ProcessedIncident['type'];
};

type ToastTriggerSource = 'live-insert' | 'live-update';
const INCIDENT_TOAST_VISIBILITY_MS = 5000;

function logIncidentToastEvent(event: string, details?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  if (details) {
    console.info(`[IncidentToasts] ${event}`, details);
    return;
  }

  console.info(`[IncidentToasts] ${event}`);
}

type QueuedIncidentToast = ToastableIncident & {
  queueKey: string;
  source: ToastTriggerSource;
  epoch: number;
};

type ActiveQueuedToast = {
  queueKey: string;
  incidentId: string;
  eventId: string;
  epoch: number;
};

function navigateToIncidentDetail(params: RootStackParamList['IncidentDetail']) {
  if (!navigationRef.isReady()) {
    console.warn('[Notifications] Navigation is not ready; skipping navigate');
    return;
  }
  navigationRef.navigate('IncidentDetail', params);
}

function isAppStateActive(state: string) {
  return state !== 'background' && state !== 'inactive';
}

function toToastableIncident(incident: ProcessedIncident): ToastableIncident {
  return {
    incidentId: incident.incidentId,
    eventId: incident.eventId,
    title: incident.title,
    createdAtMs: incident.createdAtMs,
    severity: incident.severity,
    type: incident.type,
    location: {
      address: incident.location.address,
    },
  };
}

function toKnownIncidentSnapshot(incident: ProcessedIncident): KnownIncidentSnapshot {
  return {
    incidentId: incident.incidentId,
    eventId: incident.eventId,
    severity: incident.severity,
    type: incident.type,
  };
}

function createKnownSnapshotState(incidents: readonly ProcessedIncident[]) {
  const snapshotByIncidentId = new Map<string, KnownIncidentSnapshot>();
  const revisionByIncidentId = new Map<string, string>();

  incidents.forEach((incident) => {
    snapshotByIncidentId.set(incident.incidentId, toKnownIncidentSnapshot(incident));
    revisionByIncidentId.set(incident.incidentId, incident.eventId);
  });

  return {
    snapshotByIncidentId,
    revisionByIncidentId,
  };
}

function getQueuedToastKey(incident: Pick<ToastableIncident, 'incidentId' | 'eventId'>) {
  return `${incident.incidentId}:${incident.eventId}`;
}

function useHandleIncidentNotification() {
  const { upsertMany, getIncident } = useIncidentCacheApi();
  const inFlightRef = useRef<Set<string>>(new Set());

  return useCallback(
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
    [getIncident, upsertMany]
  );
}

function usePushRegistration() {
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

function useNotificationTapHandlers(
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

function useLiveIncidentToasts(
  handleIncidentNotification: (payload: IncidentNotificationPayload) => Promise<void>
) {
  const { incidents, updatedIncidents, hasReceivedHistory } = useSharedIncidents();
  const appStateRef = useRef(AppState.currentState);
  const hasSeededRef = useRef(false);
  const baselineActiveRef = useRef(false);
  const baselineEpochRef = useRef(0);
  const notificationEligibilityStartedAtMsRef = useRef(0);
  const previousHasReceivedHistoryRef = useRef(hasReceivedHistory);
  const knownSnapshotByIncidentIdRef = useRef<Map<string, KnownIncidentSnapshot>>(new Map());
  const knownRevisionByIncidentIdRef = useRef<Map<string, string>>(new Map());
  const lastNotifiedRevisionByIncidentIdRef = useRef<Map<string, string>>(new Map());
  const queuedToastsRef = useRef<Map<string, QueuedIncidentToast>>(new Map());
  const queuedToastOrderRef = useRef<string[]>([]);
  const activeToastRef = useRef<ActiveQueuedToast | null>(null);
  const pendingNextToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingNextToastTimeout = useCallback(() => {
    if (pendingNextToastTimeoutRef.current != null) {
      clearTimeout(pendingNextToastTimeoutRef.current);
      pendingNextToastTimeoutRef.current = null;
    }
  }, []);

  const clearQueuedBacklog = useCallback(() => {
    const droppedQueuedCount = queuedToastOrderRef.current.length;
    clearPendingNextToastTimeout();
    queuedToastsRef.current.clear();
    queuedToastOrderRef.current = [];
    return droppedQueuedCount;
  }, [clearPendingNextToastTimeout]);

  const startSilentBaseline = useCallback(
    (reason: string) => {
      if (baselineActiveRef.current) {
        return false;
      }

      baselineActiveRef.current = true;
      baselineEpochRef.current += 1;
      notificationEligibilityStartedAtMsRef.current = Date.now();
      const droppedQueuedCount = clearQueuedBacklog();

      logIncidentToastEvent('baseline started', {
        reason,
        epoch: baselineEpochRef.current,
        droppedQueuedCount,
        hasActiveToast: activeToastRef.current != null,
      });

      return true;
    },
    [clearQueuedBacklog]
  );

  const completeSilentBaseline = useCallback((
    reason: string,
    nextIncidents: readonly ProcessedIncident[],
    absorbedUpdatedIncidents: readonly ProcessedIncident[] = []
  ) => {
    const { snapshotByIncidentId, revisionByIncidentId } = createKnownSnapshotState(nextIncidents);

    absorbedUpdatedIncidents.forEach((incident) => {
      snapshotByIncidentId.set(incident.incidentId, toKnownIncidentSnapshot(incident));
      revisionByIncidentId.set(incident.incidentId, incident.eventId);
    });

    knownSnapshotByIncidentIdRef.current = snapshotByIncidentId;
    knownRevisionByIncidentIdRef.current = revisionByIncidentId;
    baselineActiveRef.current = false;
    hasSeededRef.current = true;

    logIncidentToastEvent('baseline completed', {
      reason,
      epoch: baselineEpochRef.current,
      visibleIncidentCount: nextIncidents.length,
    });
  }, []);

  const showNextQueuedToast = useCallback(() => {
    clearPendingNextToastTimeout();

    if (activeToastRef.current != null) {
      return;
    }

    while (queuedToastOrderRef.current.length > 0) {
      const queueKey = queuedToastOrderRef.current[0];
      const nextToast = queuedToastsRef.current.get(queueKey);

      if (!nextToast) {
        queuedToastOrderRef.current.shift();
        continue;
      }

      if (nextToast.epoch < baselineEpochRef.current) {
        queuedToastsRef.current.delete(queueKey);
        queuedToastOrderRef.current.shift();
        logIncidentToastEvent('drop queued toast from older epoch', {
          queueKey,
          incidentId: nextToast.incidentId,
          queuedEpoch: nextToast.epoch,
          currentEpoch: baselineEpochRef.current,
        });
        continue;
      }

      activeToastRef.current = {
        queueKey,
        incidentId: nextToast.incidentId,
        eventId: nextToast.eventId,
        epoch: nextToast.epoch,
      };

      lastNotifiedRevisionByIncidentIdRef.current.set(
        nextToast.incidentId,
        nextToast.eventId
      );

      logIncidentToastEvent('showToast.show', {
        source: nextToast.source,
        incidentId: nextToast.incidentId,
        eventId: nextToast.eventId,
        title: nextToast.title,
        address: nextToast.location.address,
        createdAtMs: nextToast.createdAtMs,
      });

      showToast.show({
        type: 'info',
        text1: nextToast.title,
        text2: nextToast.location.address,
        visibilityTime: INCIDENT_TOAST_VISIBILITY_MS,
        onPress: () => {
          const currentToast = queuedToastsRef.current.get(queueKey) ?? nextToast;

          void handleIncidentNotification({
            incidentId: currentToast.incidentId,
            eventId: currentToast.eventId,
          });
        },
        onHide: () => {
          const activeToast = activeToastRef.current;
          if (!activeToast || activeToast.queueKey !== queueKey) {
            return;
          }

          const queuedCountBeforeDelete = queuedToastOrderRef.current.length;
          activeToastRef.current = null;
          queuedToastsRef.current.delete(queueKey);
          queuedToastOrderRef.current = queuedToastOrderRef.current.filter(
            (queuedKey) => queuedKey !== queueKey
          );

          logIncidentToastEvent('active toast cleared', {
            queueKey,
            incidentId: activeToast.incidentId,
            queuedCountBeforeDelete,
            queuedCountAfterDelete: queuedToastOrderRef.current.length,
          });

          if (
            pendingNextToastTimeoutRef.current == null &&
            queuedToastOrderRef.current.length > 0
          ) {
            logIncidentToastEvent('schedule next toast after hide', {
              nextQueueKey: queuedToastOrderRef.current[0],
              queuedCount: queuedToastOrderRef.current.length,
            });

            pendingNextToastTimeoutRef.current = setTimeout(() => {
              pendingNextToastTimeoutRef.current = null;
              showNextQueuedToast();
            }, 0);
          }
        },
      });
      return;
    }
  }, [clearPendingNextToastTimeout, handleIncidentNotification]);

  const enqueueIncidentToasts = useCallback(
    (incidentsToQueue: readonly ToastableIncident[], source: ToastTriggerSource) => {
      if (incidentsToQueue.length === 0) {
        return;
      }

      logIncidentToastEvent('displaying toasts', {
        source,
        count: incidentsToQueue.length,
        incidentIds: incidentsToQueue.map((incident) => incident.incidentId),
        titles: incidentsToQueue.map((incident) => incident.title),
      });

      incidentsToQueue.forEach((incident) => {
        const queueKey = getQueuedToastKey(incident);
        if (queuedToastsRef.current.has(queueKey)) {
          return;
        }

        const queuedToast: QueuedIncidentToast = {
          ...incident,
          queueKey,
          source,
          epoch: baselineEpochRef.current,
        };

        queuedToastsRef.current.set(queueKey, queuedToast);
        queuedToastOrderRef.current.push(queueKey);
      });

      showNextQueuedToast();
    },
    [showNextQueuedToast]
  );

  useEffect(() => {
    const previousHasReceivedHistory = previousHasReceivedHistoryRef.current;
    previousHasReceivedHistoryRef.current = hasReceivedHistory;

    if (!hasSeededRef.current) {
      if (!hasReceivedHistory) {
        startSilentBaseline('initial-history');
        return;
      }

      completeSilentBaseline('initial-history-complete', incidents, updatedIncidents);
      return;
    }

    if (previousHasReceivedHistory && !hasReceivedHistory) {
      startSilentBaseline('subscription-refresh');
      return;
    }

    if (!previousHasReceivedHistory && hasReceivedHistory && baselineActiveRef.current) {
      completeSilentBaseline(
        'subscription-refresh-complete',
        incidents,
        updatedIncidents
      );
    }
  }, [
    completeSilentBaseline,
    hasReceivedHistory,
    incidents,
    startSilentBaseline,
    updatedIncidents,
  ]);

  useEffect(() => {
    const liveInsertToasts: ToastableIncident[] = [];
    const liveUpdateToasts: ToastableIncident[] = [];

    if (
      !hasSeededRef.current ||
      baselineActiveRef.current ||
      !hasReceivedHistory ||
      !isAppStateActive(appStateRef.current) ||
      updatedIncidents.length === 0
    ) {
      return;
    }

    updatedIncidents.forEach((incident) => {
      const previousSnapshot = knownSnapshotByIncidentIdRef.current.get(incident.incidentId);
      const previousRevision = knownRevisionByIncidentIdRef.current.get(incident.incidentId);
      const nextSnapshot = toKnownIncidentSnapshot(incident);

      knownSnapshotByIncidentIdRef.current.set(incident.incidentId, nextSnapshot);
      knownRevisionByIncidentIdRef.current.set(incident.incidentId, incident.eventId);

      if (previousRevision === incident.eventId) {
        return;
      }

      if (
        lastNotifiedRevisionByIncidentIdRef.current.get(incident.incidentId) ===
        incident.eventId
      ) {
        return;
      }

      if (!previousSnapshot) {
        if (incident.createdAtMs < notificationEligibilityStartedAtMsRef.current) {
          return;
        }

        liveInsertToasts.push(toToastableIncident(incident));
        return;
      }

      const hasMaterialChange =
        previousSnapshot.severity !== incident.severity ||
        previousSnapshot.type !== incident.type;

      if (!hasMaterialChange) {
        return;
      }

      if (incident.createdAtMs < notificationEligibilityStartedAtMsRef.current) {
        return;
      }

      liveUpdateToasts.push(toToastableIncident(incident));
    });

    if (liveInsertToasts.length > 0) {
      enqueueIncidentToasts(liveInsertToasts, 'live-insert');
    }

    if (liveUpdateToasts.length > 0) {
      enqueueIncidentToasts(liveUpdateToasts, 'live-update');
    }
  }, [enqueueIncidentToasts, hasReceivedHistory, updatedIncidents]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        !hasSeededRef.current ||
        isAppStateActive(previousState) ||
        !isAppStateActive(nextState)
      ) {
        return;
      }

      startSilentBaseline('app-resume');

      if (hasReceivedHistory) {
        completeSilentBaseline('app-resume', incidents, updatedIncidents);
      }
    });

    return () => subscription.remove();
  }, [
    completeSilentBaseline,
    hasReceivedHistory,
    incidents,
    startSilentBaseline,
    updatedIncidents,
  ]);

  useEffect(() => {
    return () => {
      clearPendingNextToastTimeout();
      activeToastRef.current = null;
      queuedToastsRef.current.clear();
      queuedToastOrderRef.current = [];
    };
  }, [clearPendingNextToastTimeout]);
}

export default function IncidentNotificationBridge() {
  const handleIncidentNotification = useHandleIncidentNotification();

  usePushRegistration();
  useNotificationTapHandlers(handleIncidentNotification);
  useLiveIncidentToasts(handleIncidentNotification);

  return null;
}
