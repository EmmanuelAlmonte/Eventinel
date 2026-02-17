import { useRef, useState } from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';

import { createSubscriptionRegistry } from './subscriptionRegistry';
import { EMPTY_SEVERITY_COUNTS } from './sorting';
import type { IncidentSubscriptionDisplayState, ProcessedIncident, QueuedEvent } from './types';

export interface IncidentSubscriptionCoreState {
  state: IncidentSubscriptionDisplayState;
  setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
  incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
  lastUpdatedRef: MutableRefObject<number | null>;
  lastTotalEventsRef: MutableRefObject<number>;
  lastFilterKeyRef: MutableRefObject<string>;
  pendingEventsRef: MutableRefObject<QueuedEvent[]>;
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  subscriptionRegistry: ReturnType<typeof createSubscriptionRegistry>;
  lastRefreshMetaRef: MutableRefObject<{
    filterKey: string;
    desiredCount: number;
    truncated: boolean;
  }>;
}

export function useIncidentSubscriptionState(): IncidentSubscriptionCoreState {
  const incidentMapRef = useRef<Map<string, ProcessedIncident>>(new Map());
  const lastUpdatedRef = useRef<number | null>(null);
  const lastTotalEventsRef = useRef(0);
  const lastFilterKeyRef = useRef<string>('disabled');
  const pendingEventsRef = useRef<QueuedEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscriptionRegistry = useRef(createSubscriptionRegistry()).current;
  const lastRefreshMetaRef = useRef({
    filterKey: 'disabled',
    desiredCount: 0,
    truncated: false,
  });

  const [state, setState] = useState<IncidentSubscriptionDisplayState>({
    incidents: [],
    severityCounts: EMPTY_SEVERITY_COUNTS,
    updatedIncidents: [],
    totalEventsReceived: 0,
    hasReceivedHistory: false,
  });

  return {
    state,
    setState,
    incidentMapRef,
    lastUpdatedRef,
    lastTotalEventsRef,
    lastFilterKeyRef,
    pendingEventsRef,
    flushTimerRef,
    subscriptionRegistry,
    lastRefreshMetaRef,
  };
}
