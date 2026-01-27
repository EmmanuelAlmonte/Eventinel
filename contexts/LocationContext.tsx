/**
 * LocationContext
 *
 * Shared location state across all screens. Solves the race condition where
 * independent useUserLocation() hooks in different screens could result in
 * different locations (real GPS vs fallback) depending on timing.
 *
 * Pattern: Follows IncidentCacheContext.tsx and ndk-mobile Context Provider pattern.
 *
 * Usage:
 *   // In App.tsx - wrap with provider
 *   <LocationProvider>
 *     <MainNavigation />
 *   </LocationProvider>
 *
 *   // In screens - use shared location
 *   const { location, isLoading } = useSharedLocation();
 */

import React, { createContext, useContext } from 'react';
import { useUserLocation } from '../hooks/useUserLocation';
import type { UseUserLocationResult } from '../hooks/useUserLocation';

const LocationContext = createContext<UseUserLocationResult | null>(null);

/**
 * LocationProvider
 *
 * Wraps the app and provides shared location state to all children.
 * Location is fetched ONCE at app startup and shared to all screens.
 */
export function LocationProvider({ children }: { children: React.ReactNode }) {
  // Called ONCE when provider mounts - shared to all children
  // Using 'none' fallback - wait for real GPS instead of showing default location
  // This prevents race conditions where screens get different locations (default vs GPS)
  const locationState = useUserLocation({
    fallback: 'none',
  });

  return (
    <LocationContext.Provider value={locationState}>
      {children}
    </LocationContext.Provider>
  );
}

/**
 * useSharedLocation
 *
 * Returns the shared location state from LocationProvider.
 * Must be used within LocationProvider.
 *
 * @returns UseUserLocationResult - location, permission, source, isLoading, error, refresh
 * @throws Error if used outside LocationProvider
 */
export function useSharedLocation(): UseUserLocationResult {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useSharedLocation must be used within LocationProvider');
  }
  return context;
}
