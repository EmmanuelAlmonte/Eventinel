/**
 * Shared incident subscription context.
 *
 * Provides a single subscription pipeline consumed by map/feed screens.
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';

import { useIncidentSubscription } from '@hooks';
import { useIncidentCacheApi } from './IncidentCacheContext';

import { useSubscriptionGate } from './incidentSubscription/useSubscriptionGate';
import type { IncidentSubscriptionContextValue } from './incidentSubscription/types';

const IncidentSubscriptionContext = createContext<IncidentSubscriptionContextValue | null>(null);

export function IncidentSubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { upsertMany } = useIncidentCacheApi();
  const {
    location,
    subscriptionLocation,
    effectiveSubscriptionViewport,
    isSubscriptionEnabled,
    setMapFocused,
    setMapSubscriptionAnchor,
    setMapSubscriptionViewport,
    setFeedFocused,
  } = useSubscriptionGate();

  const {
    incidents,
    isInitialLoading,
    hasReceivedHistory,
    severityCounts,
    updatedIncidents,
  } = useIncidentSubscription({
    location,
    subscriptionLocation,
    subscriptionViewport: effectiveSubscriptionViewport,
    enabled: isSubscriptionEnabled,
  });

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
      setMapFocused,
      setMapSubscriptionAnchor,
      setMapSubscriptionViewport,
      setFeedFocused,
    }),
    [
      incidents,
      isInitialLoading,
      hasReceivedHistory,
      severityCounts,
      setMapFocused,
      setMapSubscriptionAnchor,
      setMapSubscriptionViewport,
      setFeedFocused,
    ]
  );

  return (
    <IncidentSubscriptionContext.Provider value={contextValue}>
      {children}
    </IncidentSubscriptionContext.Provider>
  );
}

export function useSharedIncidents(): IncidentSubscriptionContextValue {
  const context = useContext(IncidentSubscriptionContext);
  if (!context) {
    throw new Error('useSharedIncidents must be used within IncidentSubscriptionProvider');
  }
  return context;
}
