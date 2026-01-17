/**
 * IncidentCacheContext
 *
 * Lightweight shared cache for incidents. Allows screens to:
 * - Store incidents when fetched (Map/Feed)
 * - Lookup incidents by ID (Detail screen)
 *
 * This enables incidentId-only navigation (no serialization warnings).
 */

import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import type { ProcessedIncident } from '@hooks/useIncidentSubscription';

interface IncidentCacheContextValue {
  /** Get an incident by ID */
  getIncident: (incidentId: string) => ProcessedIncident | undefined;
  /** Upsert multiple incidents into the cache */
  upsertMany: (incidents: ProcessedIncident[]) => void;
  /** Version number - changes when cache updates (triggers re-renders) */
  version: number;
}

const IncidentCacheContext = createContext<IncidentCacheContextValue | null>(null);

/** Max cache size to prevent unbounded growth */
const MAX_CACHE_SIZE = 500;

export function IncidentCacheProvider({ children }: { children: React.ReactNode }) {
  // Cache stored in ref (fast reads, no re-render on mutation)
  const cacheRef = useRef<Map<string, ProcessedIncident>>(new Map());
  // Version triggers re-renders in consumers when cache updates
  const [version, setVersion] = useState(0);

  const getIncident = useCallback((incidentId: string) => {
    return cacheRef.current.get(incidentId);
  }, []);

  const upsertMany = useCallback((incidents: ProcessedIncident[]) => {
    let didUpdate = false;

    for (const incident of incidents) {
      const existing = cacheRef.current.get(incident.incidentId);
      // Only update if newer (by createdAt)
      if (!existing || incident.createdAt > existing.createdAt) {
        cacheRef.current.set(incident.incidentId, incident);
        didUpdate = true;
      }
    }

    // Evict oldest if over limit
    if (cacheRef.current.size > MAX_CACHE_SIZE) {
      const entries = Array.from(cacheRef.current.entries());
      // Sort by createdAt ascending (oldest first)
      entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
      // Remove oldest entries
      const toRemove = entries.slice(0, cacheRef.current.size - MAX_CACHE_SIZE);
      for (const [key] of toRemove) {
        cacheRef.current.delete(key);
      }
      didUpdate = true;
    }

    // Bump version to trigger re-renders in consumers
    if (didUpdate) {
      setVersion(v => v + 1);
    }
  }, []);

  return (
    <IncidentCacheContext.Provider value={{ getIncident, upsertMany, version }}>
      {children}
    </IncidentCacheContext.Provider>
  );
}

export function useIncidentCache() {
  const context = useContext(IncidentCacheContext);
  if (!context) {
    throw new Error('useIncidentCache must be used within IncidentCacheProvider');
  }
  return context;
}
