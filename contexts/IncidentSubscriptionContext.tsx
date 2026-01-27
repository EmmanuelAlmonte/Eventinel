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

import React, { createContext, useContext, useEffect } from 'react';
import { useIncidentSubscription } from '@hooks';
import type { ProcessedIncident } from '@hooks';
import { useSharedLocation } from './LocationContext';
import { useIncidentCache } from './IncidentCacheContext';
import type { Severity } from '@lib/nostr/config';

interface IncidentSubscriptionContextValue {
  /** Parsed incidents (sorted by occurredAt, deduplicated) */
  incidents: ProcessedIncident[];
  /** True until first EOSE received */
  isInitialLoading: boolean;
  /** True after EOSE (historical events received) */
  hasReceivedHistory: boolean;
  /** Severity counts for displayed incidents */
  severityCounts: Record<Severity, number>;
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
  const { upsertMany } = useIncidentCache();

  // Single subscription shared by all screens
  const {
    incidents,
    isInitialLoading,
    hasReceivedHistory,
    severityCounts,
  } = useIncidentSubscription({
    location,
    enabled: !!location, // Only subscribe when we have real GPS location
  });

  // Cache incidents centrally for Detail screen lookups
  useEffect(() => {
    if (incidents.length > 0) {
      upsertMany(incidents);
    }
  }, [incidents, upsertMany]);

  return (
    <IncidentSubscriptionContext.Provider
      value={{
        incidents,
        isInitialLoading,
        hasReceivedHistory,
        severityCounts,
      }}
    >
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
