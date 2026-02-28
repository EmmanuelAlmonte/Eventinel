import { useEffect, useRef, useState } from 'react';

import { useIncidentCache } from '@contexts';
import { toProcessedIncident } from '@hooks/useIncidentSubscription';
import type { ProcessedIncident } from '@hooks/useIncidentSubscription';
import { fetchIncidentFromRelay } from '@lib/notifications/incidentNotifications';

type UseIncidentRecordOptions = {
  incidentId?: string;
  eventId?: string;
};

export function useIncidentRecord({ incidentId, eventId }: UseIncidentRecordOptions) {
  const { getIncident, upsertMany } = useIncidentCache();
  const cachedIncident = incidentId ? getIncident(incidentId) : undefined;
  const [fetchedIncident, setFetchedIncident] = useState<ProcessedIncident | null>(null);
  const incident = cachedIncident ?? fetchedIncident ?? undefined;

  const [showNotFound, setShowNotFound] = useState(false);
  const inFlightRef = useRef<string | null>(null);
  const incidentRef = useRef<ProcessedIncident | null>(null);

  useEffect(() => {
    incidentRef.current = incident ?? null;
    if (incident) {
      setShowNotFound(false);
    }
  }, [incident]);

  useEffect(() => {
    const key = eventId ?? incidentId;
    if (!key) {
      setShowNotFound(true);
      return;
    }

    if (incident) return;
    if (inFlightRef.current === key) return;

    console.log('[IncidentDetail] Cache miss for:', key);
    inFlightRef.current = key;
    setShowNotFound(false);

    const timer = setTimeout(() => {
      if (!incidentRef.current) {
        setShowNotFound(true);
      }
    }, 2000);

    fetchIncidentFromRelay({ incidentId, eventId })
      .then((parsed) => {
        if (!parsed) return;
        const processed = toProcessedIncident(parsed);
        incidentRef.current = processed;
        setFetchedIncident(processed);
        upsertMany([processed]);
      })
      .catch((error) => {
        console.warn('[IncidentDetail] Read-through fetch failed:', error);
      })
      .finally(() => {
        clearTimeout(timer);
        inFlightRef.current = null;
        if (!incidentRef.current) {
          setShowNotFound(true);
        }
      });
  }, [eventId, incident, incidentId, upsertMany]);

  return { incident, showNotFound };
}
