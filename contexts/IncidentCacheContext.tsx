/**
 * IncidentCacheContext
 *
 * Lightweight shared cache for incidents. Allows screens to:
 * - Store incidents when fetched (Map/Feed)
 * - Lookup incidents by ID (Detail screen)
 *
 * This enables incidentId-only navigation (no serialization warnings).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { ProcessedIncident } from '@hooks/useIncidentSubscription';
import { INCIDENT_LIMITS } from '@lib/map/constants';

export interface IncidentCacheApi {
  /** Get an incident by ID */
  getIncident: (incidentId: string) => ProcessedIncident | undefined;
  /** Upsert multiple incidents into the cache */
  upsertMany: (incidents: ProcessedIncident[]) => void;
}

type IncidentCacheListener = () => void;

interface IncidentCacheStore extends IncidentCacheApi {
  /** Current version (increments on mutation) */
  getVersion: () => number;
  /** Subscribe to mutations */
  subscribe: (listener: IncidentCacheListener) => () => void;
}

const IncidentCacheContext = createContext<IncidentCacheStore | null>(null);

export function IncidentCacheProvider({ children }: { children: React.ReactNode }) {
  // Cache stored in ref (fast reads, no re-render on mutation)
  const cacheRef = useRef<Map<string, ProcessedIncident>>(new Map());
  // External-store pattern: provider does NOT re-render on writes; subscribers do.
  const versionRef = useRef(0);
  const listenersRef = useRef<Set<IncidentCacheListener>>(new Set());

  const getIncident = useCallback((incidentId: string) => {
    return cacheRef.current.get(incidentId);
  }, []);

  const getVersion = useCallback(() => versionRef.current, []);

  const subscribe = useCallback((listener: IncidentCacheListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const emitChange = useCallback(() => {
    versionRef.current += 1;
    for (const listener of listenersRef.current) {
      try {
        listener();
      } catch (error) {
        console.warn('[IncidentCache] listener error:', error);
      }
    }
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
    if (cacheRef.current.size > INCIDENT_LIMITS.MAX_CACHE) {
      const entries = Array.from(cacheRef.current.entries());
      // Sort by createdAt ascending (oldest first)
      entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
      // Remove oldest entries
      const toRemove = entries.slice(0, cacheRef.current.size - INCIDENT_LIMITS.MAX_CACHE);
      for (const [key] of toRemove) {
        cacheRef.current.delete(key);
      }
      didUpdate = true;
    }

    // Notify subscribers only when the cache actually changes.
    if (didUpdate) {
      emitChange();
    }
  }, [emitChange]);

  const store = useMemo<IncidentCacheStore>(
    () => ({
      getIncident,
      upsertMany,
      getVersion,
      subscribe,
    }),
    [getIncident, getVersion, subscribe, upsertMany]
  );

  return (
    <IncidentCacheContext.Provider value={store}>
      {children}
    </IncidentCacheContext.Provider>
  );
}

function useIncidentCacheStore(): IncidentCacheStore {
  const store = useContext(IncidentCacheContext);
  if (!store) {
    throw new Error('useIncidentCache must be used within IncidentCacheProvider');
  }
  return store;
}

/**
 * useIncidentCacheApi
 *
 * Accessor/mutator API without subscribing to cache changes.
 * Use this in producers (subscription provider, notification bridge) to avoid render fan-out.
 */
export function useIncidentCacheApi(): IncidentCacheApi {
  const store = useIncidentCacheStore();
  return useMemo(
    () => ({
      getIncident: store.getIncident,
      upsertMany: store.upsertMany,
    }),
    [store]
  );
}

/**
 * useIncidentCacheVersion
 *
 * Subscribes to cache mutations. Use sparingly (detail screens that need live updates).
 */
export function useIncidentCacheVersion(): number {
  const store = useIncidentCacheStore();
  return useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
}

/**
 * useIncidentCache
 *
 * Backwards-compatible hook that includes `version` for subscription-based rerenders.
 */
export function useIncidentCache(): IncidentCacheApi & { version: number } {
  const store = useIncidentCacheStore();
  const version = useIncidentCacheVersion();

  return useMemo(
    () => ({
      getIncident: store.getIncident,
      upsertMany: store.upsertMany,
      version,
    }),
    [store, version]
  );
}
