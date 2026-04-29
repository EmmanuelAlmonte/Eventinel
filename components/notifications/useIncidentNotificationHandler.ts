import { useCallback, useRef } from 'react';

import { showToast } from '@components/ui';
import { useIncidentCacheApi } from '@contexts';
import { toProcessedIncident } from '@hooks/useIncidentSubscription';
import { navigationRef, type RootStackParamList } from '@lib/navigation';
import {
  fetchIncidentFromRelay,
  type IncidentNotificationPayload,
} from '@lib/notifications/incidentNotifications';

function navigateToIncidentDetail(params: RootStackParamList['IncidentDetail']) {
  if (!navigationRef.isReady()) {
    console.warn('[Notifications] Navigation is not ready; skipping navigate');
    return;
  }
  navigationRef.navigate('IncidentDetail', params);
}

export function useIncidentNotificationHandler() {
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
