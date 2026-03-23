import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  createIncidentHistoryWindowSaveCoordinator,
  DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS,
  loadIncidentHistoryWindowDays,
  saveIncidentHistoryWindowDays,
} from '@lib/incidentHistoryWindow';

export interface IncidentHistoryWindowContextValue {
  historyWindowDays: number;
  isReady: boolean;
  setHistoryWindowDays: (days: number) => Promise<void>;
}

const IncidentHistoryWindowContext = createContext<IncidentHistoryWindowContextValue | null>(null);

export function IncidentHistoryWindowProvider({ children }: { children: React.ReactNode }) {
  const [historyWindowDays, setHistoryWindowDaysState] = useState<number>(
    DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS
  );
  const [isReady, setIsReady] = useState(false);
  const saveCoordinatorRef = useRef(
    createIncidentHistoryWindowSaveCoordinator(saveIncidentHistoryWindowDays)
  );

  useEffect(() => {
    let isMounted = true;

    const loadSetting = async () => {
      const loadedDays = await loadIncidentHistoryWindowDays();
      if (!isMounted) {
        return;
      }

      setHistoryWindowDaysState(saveCoordinatorRef.current.hydrate(loadedDays));
      setIsReady(true);
    };

    void loadSetting();

    return () => {
      isMounted = false;
    };
  }, []);

  const setHistoryWindowDays = useCallback(
    async (days: number) => {
      const { normalizedDays, pending } = saveCoordinatorRef.current.enqueue(days);
      setHistoryWindowDaysState(normalizedDays);
      await pending;
    },
    []
  );

  const value = useMemo(
    () => ({
      historyWindowDays,
      isReady,
      setHistoryWindowDays,
    }),
    [historyWindowDays, isReady, setHistoryWindowDays]
  );

  return (
    <IncidentHistoryWindowContext.Provider value={value}>
      {children}
    </IncidentHistoryWindowContext.Provider>
  );
}

export function useIncidentHistoryWindow(): IncidentHistoryWindowContextValue {
  const context = useContext(IncidentHistoryWindowContext);
  if (!context) {
    throw new Error(
      'useIncidentHistoryWindow must be used within IncidentHistoryWindowProvider'
    );
  }

  return context;
}
