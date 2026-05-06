import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { showToast } from '@components/ui';
import { useSharedIncidents } from '@contexts';
import type { ProcessedIncident } from '@hooks';
import type { IncidentNotificationPayload } from '@lib/notifications/incidentNotifications';

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

type SilentBaselineReason =
  | 'initial-history'
  | 'history-window-refresh'
  | 'subscription-refresh'
  | 'app-resume';

type ToastTriggerSource = 'live-insert' | 'live-update';

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

const INCIDENT_TOAST_VISIBILITY_MS = 5000;
const MAX_QUEUED_INCIDENT_TOASTS = 4;

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
  return incident.incidentId;
}

function getIncidentRevisionKey(
  incident: Pick<ProcessedIncident, 'incidentId' | 'eventId'>
) {
  return `${incident.incidentId}:${incident.eventId}`;
}

export function useLiveIncidentToasts(
  handleIncidentNotification: (payload: IncidentNotificationPayload) => Promise<void>
) {
  const {
    incidents,
    updatedIncidents,
    hasReceivedHistory,
    historyWindowDays,
  } = useSharedIncidents();
  const appStateRef = useRef(AppState.currentState);
  const hasSeededRef = useRef(false);
  const baselineActiveRef = useRef(false);
  const baselineReasonRef = useRef<SilentBaselineReason | null>(null);
  const baselineEpochRef = useRef(0);
  const notificationEligibilityStartedAtMsRef = useRef(0);
  const previousHasReceivedHistoryRef = useRef(hasReceivedHistory);
  const previousHistoryWindowDaysRef = useRef(historyWindowDays);
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

  const trimQueuedToastBacklog = useCallback(() => {
    while (queuedToastOrderRef.current.length > MAX_QUEUED_INCIDENT_TOASTS) {
      const droppedQueueKey = queuedToastOrderRef.current.shift();
      if (!droppedQueueKey) {
        return;
      }

      const droppedToast = queuedToastsRef.current.get(droppedQueueKey);
      queuedToastsRef.current.delete(droppedQueueKey);

      if (!droppedToast) {
        continue;
      }

      logIncidentToastEvent('drop queued toast due to backlog cap', {
        queueKey: droppedQueueKey,
        incidentId: droppedToast.incidentId,
        eventId: droppedToast.eventId,
        queuedCountAfterDrop: queuedToastOrderRef.current.length,
      });
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
    (reason: SilentBaselineReason) => {
      if (baselineActiveRef.current) {
        return false;
      }

      baselineActiveRef.current = true;
      baselineReasonRef.current = reason;
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
    const baselineReason = baselineReasonRef.current;
    const baselineStartedAtMs = notificationEligibilityStartedAtMsRef.current;
    const postBaselineLiveIncidents =
      baselineReason === 'subscription-refresh'
        ? absorbedUpdatedIncidents.filter(
            (incident) => incident.createdAtMs >= baselineStartedAtMs
          )
        : [];
    const postBaselineLiveRevisionKeys = new Set(
      postBaselineLiveIncidents.map(getIncidentRevisionKey)
    );
    const previousSnapshotByIncidentId = knownSnapshotByIncidentIdRef.current;
    const previousRevisionByIncidentId = knownRevisionByIncidentIdRef.current;
    const { snapshotByIncidentId, revisionByIncidentId } = createKnownSnapshotState(nextIncidents);

    absorbedUpdatedIncidents.forEach((incident) => {
      if (postBaselineLiveRevisionKeys.has(getIncidentRevisionKey(incident))) {
        const previousSnapshot = previousSnapshotByIncidentId.get(incident.incidentId);
        const previousRevision =
          previousRevisionByIncidentId.get(incident.incidentId) ??
          previousSnapshot?.eventId;

        snapshotByIncidentId.delete(incident.incidentId);
        revisionByIncidentId.delete(incident.incidentId);

        if (previousSnapshot) {
          snapshotByIncidentId.set(incident.incidentId, previousSnapshot);
        }
        if (previousRevision) {
          revisionByIncidentId.set(incident.incidentId, previousRevision);
        }
        return;
      }

      snapshotByIncidentId.set(incident.incidentId, toKnownIncidentSnapshot(incident));
      revisionByIncidentId.set(incident.incidentId, incident.eventId);
    });

    knownSnapshotByIncidentIdRef.current = snapshotByIncidentId;
    knownRevisionByIncidentIdRef.current = revisionByIncidentId;
    baselineActiveRef.current = false;
    baselineReasonRef.current = null;
    hasSeededRef.current = true;

    logIncidentToastEvent('baseline completed', {
      reason,
      baselineReason,
      epoch: baselineEpochRef.current,
      visibleIncidentCount: nextIncidents.length,
      postBaselineLiveCount: postBaselineLiveIncidents.length,
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
      queuedToastsRef.current.delete(queueKey);
      queuedToastOrderRef.current.shift();

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
          if (
            !activeToast ||
            activeToast.queueKey !== queueKey ||
            activeToast.eventId !== nextToast.eventId
          ) {
            return;
          }

          activeToastRef.current = null;

          logIncidentToastEvent('active toast cleared', {
            queueKey,
            incidentId: activeToast.incidentId,
            queuedCountRemaining: queuedToastOrderRef.current.length,
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
        if (activeToastRef.current?.queueKey === queueKey) {
          logIncidentToastEvent('drop toast update while incident is already active', {
            queueKey,
            incidentId: incident.incidentId,
            activeEventId: activeToastRef.current.eventId,
            droppedEventId: incident.eventId,
          });
          return;
        }

        const queuedToast: QueuedIncidentToast = {
          ...incident,
          queueKey,
          source,
          epoch: baselineEpochRef.current,
        };

        const existingQueuedToast = queuedToastsRef.current.get(queueKey);
        if (existingQueuedToast) {
          queuedToastsRef.current.set(queueKey, queuedToast);
          logIncidentToastEvent('collapse queued toast to latest incident revision', {
            queueKey,
            incidentId: incident.incidentId,
            previousEventId: existingQueuedToast.eventId,
            nextEventId: incident.eventId,
          });
          return;
        }

        queuedToastsRef.current.set(queueKey, queuedToast);
        queuedToastOrderRef.current.push(queueKey);

        if (activeToastRef.current == null) {
          showNextQueuedToast();
        }
      });

      trimQueuedToastBacklog();
      showNextQueuedToast();
    },
    [showNextQueuedToast, trimQueuedToastBacklog]
  );

  useEffect(() => {
    const previousHasReceivedHistory = previousHasReceivedHistoryRef.current;
    const previousHistoryWindowDays = previousHistoryWindowDaysRef.current;
    previousHasReceivedHistoryRef.current = hasReceivedHistory;
    previousHistoryWindowDaysRef.current = historyWindowDays;

    if (!hasSeededRef.current) {
      if (!hasReceivedHistory) {
        startSilentBaseline('initial-history');
        return;
      }

      completeSilentBaseline('initial-history-complete', incidents, updatedIncidents);
      return;
    }

    if (previousHasReceivedHistory && !hasReceivedHistory) {
      startSilentBaseline(
        previousHistoryWindowDays !== historyWindowDays
          ? 'history-window-refresh'
          : 'subscription-refresh'
      );
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
    historyWindowDays,
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
