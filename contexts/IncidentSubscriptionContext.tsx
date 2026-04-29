/**
 * Shared incident subscription context.
 *
 * Provides a single subscription pipeline consumed by map/feed screens.
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';

import { useIncidentSubscription } from '@hooks';
import { useIncidentCacheApi } from './IncidentCacheContext';
import { useIncidentHistoryWindow } from './IncidentHistoryWindowContext';

import { useSubscriptionGate } from './incidentSubscription/useSubscriptionGate';
import type { IncidentSubscriptionContextValue } from './incidentSubscription/types';

const IncidentSubscriptionContext = createContext<IncidentSubscriptionContextValue | null>(null);

export function IncidentSubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { removeMany, upsertMany } = useIncidentCacheApi();
  const { historyWindowDays, isReady } = useIncidentHistoryWindow();
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
    updatedIncidents,
    removedIncidentIds,
    isInitialLoading,
    hasReceivedHistory,
    severityCounts,
  } = useIncidentSubscription({
    location,
    subscriptionLocation,
    subscriptionViewport: effectiveSubscriptionViewport,
    enabled: isSubscriptionEnabled && isReady,
    sinceDays: historyWindowDays,
  });

  useEffect(() => {
    if (updatedIncidents && updatedIncidents.length > 0) {
      upsertMany(updatedIncidents);
    }
  }, [updatedIncidents, upsertMany]);

  useEffect(() => {
    if (removedIncidentIds && removedIncidentIds.length > 0) {
      removeMany(removedIncidentIds);
    }
  }, [removedIncidentIds, removeMany]);

  const contextValue = useMemo(
    () => ({
      incidents,
      updatedIncidents,
      isInitialLoading,
      hasReceivedHistory,
      historyWindowDays,
      severityCounts,
      setMapFocused,
      setMapSubscriptionAnchor,
      setMapSubscriptionViewport,
      setFeedFocused,
    }),
    [
      incidents,
      updatedIncidents,
      isInitialLoading,
      hasReceivedHistory,
      historyWindowDays,
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
