/**
 * IncidentSubscriptionContext
 *
 * Shared incident subscription across all screens. Solves the race condition where
 * independent useIncidentSubscription() hooks in MapScreen and IncidentFeedScreen
 * resulted in different incident counts depending on timing (one shows 0, other shows 99).
 *
 * Pattern: Single subscription at provider level, consumed by both screens via context.
 *
 * Usage:
 *   // In App.tsx - wrap with provider (must be INSIDE IncidentCacheProvider)
 *   <IncidentSubscriptionProvider>
 *     <MainNavigation />
 *   </IncidentSubscriptionProvider>
 *
 *   // In screens - use shared incidents
 *   const { incidents, isInitialLoading } = useSharedIncidents();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useIncidentSubscription } from '@hooks';
import type { ProcessedIncident } from '@hooks';
import { useSharedLocation } from './LocationContext';
import { useIncidentCacheApi } from './IncidentCacheContext';
import type { Severity } from '@lib/nostr/config';

interface IncidentSubscriptionContextValue {
  /** Parsed incidents (sorted by distance, then recency, then id) */
  incidents: ProcessedIncident[];
  /** True until first EOSE received */
  isInitialLoading: boolean;
  /** True after EOSE (historical events received) */
  hasReceivedHistory: boolean;
  /** Severity counts for displayed incidents */
  severityCounts: Record<Severity, number>;
  /** Report Map screen focus for subscription gating */
  setMapFocused: (focused: boolean) => void;
  /** Report Feed screen focus for subscription gating */
  setFeedFocused: (focused: boolean) => void;
}

const IncidentSubscriptionContext = createContext<IncidentSubscriptionContextValue | null>(null);

/**
 * IncidentSubscriptionProvider
 *
 * Wraps the app navigation and provides shared incident subscription state.
 * Creates ONE subscription that both MapScreen and IncidentFeedScreen consume.
 *
 * IMPORTANT: Must be placed INSIDE IncidentCacheProvider so it can call useIncidentCache().
 */
export function IncidentSubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { location } = useSharedLocation();
  const { upsertMany } = useIncidentCacheApi();
  const [isMapFocused, setIsMapFocused] = useState(false);
  const [isFeedFocused, setIsFeedFocused] = useState(false);
  const [isAppActive, setIsAppActive] = useState(() => {
    const currentState = AppState.currentState;
    // AppState can be 'unknown' on startup in some environments; treat that as active
    // to avoid suppressing cache hydration and subscriptions on cold start.
    return currentState !== 'background' && currentState !== 'inactive';
  });

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      setIsAppActive(nextState !== 'background' && nextState !== 'inactive');
    };

    const subscription = AppState.addEventListener?.('change', handleAppStateChange);
    return () => subscription?.remove?.();
  }, []);

  const handleSetMapFocused = useCallback((focused: boolean) => {
    setIsMapFocused(focused);
  }, []);

  const handleSetFeedFocused = useCallback((focused: boolean) => {
    setIsFeedFocused(focused);
  }, []);

  const isScreenFocused = isMapFocused || isFeedFocused;
  const isSubscriptionEnabled = !!location && isScreenFocused && isAppActive;

  // Single subscription shared by all screens
  // NOTE: useIncidentSubscription() now prefilters to a 3x3 (9-cell) geohash grid
  // around the user's location via `#g` (p6) when `location` is available.
  const {
    incidents,
    isInitialLoading,
    hasReceivedHistory,
    severityCounts,
    updatedIncidents,
  } = useIncidentSubscription({
    location,
    enabled: isSubscriptionEnabled, // Only subscribe when focused, active, and location is available
  });

  // Cache incidents centrally for Detail screen lookups
  useEffect(() => {
    if (updatedIncidents && updatedIncidents.length > 0) {
      upsertMany(updatedIncidents);
    }
  }, [updatedIncidents, upsertMany]);

  const contextValue = useMemo(
    () => ({
      incidents,
      isInitialLoading,
      hasReceivedHistory,
      severityCounts,
      setMapFocused: handleSetMapFocused,
      setFeedFocused: handleSetFeedFocused,
    }),
    [
      incidents,
      isInitialLoading,
      hasReceivedHistory,
      severityCounts,
      handleSetMapFocused,
      handleSetFeedFocused,
    ]
  );

  return (
    <IncidentSubscriptionContext.Provider value={contextValue}>
      {children}
    </IncidentSubscriptionContext.Provider>
  );
}

/**
 * useSharedIncidents
 *
 * Returns the shared incident subscription state from IncidentSubscriptionProvider.
 * Must be used within IncidentSubscriptionProvider.
 *
 * @returns Incident subscription state - incidents, loading flags, severity counts
 * @throws Error if used outside IncidentSubscriptionProvider
 */
export function useSharedIncidents(): IncidentSubscriptionContextValue {
  const context = useContext(IncidentSubscriptionContext);
  if (!context) {
    throw new Error('useSharedIncidents must be used within IncidentSubscriptionProvider');
  }
  return context;
}
