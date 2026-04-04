import { useRef, useState } from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';

import { createSubscriptionRegistry } from './subscriptionRegistry';
import { EMPTY_SEVERITY_COUNTS } from './sorting';
import type {
  HistoryRefreshProgress,
  IncidentSubscriptionDisplayState,
  ProcessedIncident,
  QueuedEvent,
} from './types';

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
    sinceDays: number;
  }>;
  refreshEpochRef: MutableRefObject<number>;
  activeHistoryRefreshRef: MutableRefObject<HistoryRefreshProgress | null>;
  refreshWatchdogTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
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
    sinceDays: 0,
  });
  const refreshEpochRef = useRef(0);
  const activeHistoryRefreshRef = useRef<HistoryRefreshProgress | null>(null);
  const refreshWatchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    refreshEpochRef,
    activeHistoryRefreshRef,
    refreshWatchdogTimerRef,
  };
}
