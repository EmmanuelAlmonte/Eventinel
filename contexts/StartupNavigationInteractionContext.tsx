import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type StartupTabName = 'Map' | 'Incidents' | 'Report' | 'Profile';

interface StartupNavigationInteractionContextValue {
  hasStartupMapRequest: boolean;
  lastStartupTabInteractionAt: number | null;
  markStartupTabInteraction: (tabName: StartupTabName) => void;
}

const StartupNavigationInteractionContext = createContext<StartupNavigationInteractionContextValue>({
  hasStartupMapRequest: false,
  lastStartupTabInteractionAt: null,
  markStartupTabInteraction: () => {},
});

interface StartupNavigationInteractionProviderProps {
  children: ReactNode;
}

export function StartupNavigationInteractionProvider({
  children,
}: StartupNavigationInteractionProviderProps) {
  const [hasStartupMapRequest, setHasStartupMapRequest] = useState(false);
  const [lastStartupTabInteractionAt, setLastStartupTabInteractionAt] = useState<number | null>(null);

  const markStartupTabInteraction = useCallback((tabName: StartupTabName) => {
    setLastStartupTabInteractionAt(Date.now());
    if (tabName === 'Map') {
      setHasStartupMapRequest(true);
    }
  }, []);

  const value = useMemo(
    () => ({
      hasStartupMapRequest,
      lastStartupTabInteractionAt,
      markStartupTabInteraction,
    }),
    [hasStartupMapRequest, lastStartupTabInteractionAt, markStartupTabInteraction]
  );

  return (
    <StartupNavigationInteractionContext.Provider value={value}>
      {children}
    </StartupNavigationInteractionContext.Provider>
  );
}

export function useStartupNavigationInteraction() {
  return useContext(StartupNavigationInteractionContext);
}
