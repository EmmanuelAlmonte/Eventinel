/**
 * RelayStatusContext
 *
 * Shared relay connection state across the app.
 * Provides relay pool stats for gating subscriptions and UI status.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ndk } from '@lib/ndk';
import { isConnected, isConnecting, relayToInfo, sortRelays } from '@lib/relay/status';
import type { RelayInfo, RelayPoolStats } from '../types/relay';

interface RelayStatusContextValue {
  /** Relay details for UI display */
  relays: RelayInfo[];
  /** Aggregate relay pool stats */
  stats: RelayPoolStats;
  /** True when at least one relay is connected */
  hasConnectedRelay: boolean;
  /** True when there are relays in the pool */
  hasRelays: boolean;
  /** True when any relay is in a connecting state */
  isConnecting: boolean;
}

const RelayStatusContext = createContext<RelayStatusContextValue | null>(null);

const EMPTY_STATS: RelayPoolStats = {
  total: 0,
  connected: 0,
  connecting: 0,
  disconnected: 0,
};

export function RelayStatusProvider({ children }: { children: React.ReactNode }) {
  const [relays, setRelays] = useState<RelayInfo[]>([]);
  const [stats, setStats] = useState<RelayPoolStats>(EMPTY_STATS);

  const updateRelays = useCallback(() => {
    const poolRelays = Array.from(ndk.pool.relays.values());
    const relayInfos = sortRelays(poolRelays.map(relayToInfo));

    const nextStats: RelayPoolStats = {
      total: poolRelays.length,
      connected: 0,
      connecting: 0,
      disconnected: 0,
    };

    for (const relay of poolRelays) {
      if (isConnected(relay.status)) {
        nextStats.connected += 1;
      } else if (isConnecting(relay.status)) {
        nextStats.connecting += 1;
      } else {
        nextStats.disconnected += 1;
      }
    }

    setRelays(relayInfos);
    setStats(nextStats);
  }, []);

  useEffect(() => {
    updateRelays();

    const handleUpdate = () => updateRelays();

    ndk.pool.on('relay:connect', handleUpdate);
    ndk.pool.on('relay:disconnect', handleUpdate);
    ndk.pool.on('relay:connecting', handleUpdate);
    ndk.pool.on('relay:auth', handleUpdate);
    ndk.pool.on('relay:authed', handleUpdate);
    ndk.pool.on('flapping', handleUpdate);

    return () => {
      ndk.pool.off('relay:connect', handleUpdate);
      ndk.pool.off('relay:disconnect', handleUpdate);
      ndk.pool.off('relay:connecting', handleUpdate);
      ndk.pool.off('relay:auth', handleUpdate);
      ndk.pool.off('relay:authed', handleUpdate);
      ndk.pool.off('flapping', handleUpdate);
    };
  }, [updateRelays]);

  const value = useMemo(() => {
    const hasConnectedRelay = stats.connected > 0;
    const hasRelays = stats.total > 0;
    const isConnectingNow = stats.connecting > 0;

    return {
      relays,
      stats,
      hasConnectedRelay,
      hasRelays,
      isConnecting: isConnectingNow,
    };
  }, [relays, stats]);

  return (
    <RelayStatusContext.Provider value={value}>
      {children}
    </RelayStatusContext.Provider>
  );
}

export function useRelayStatus(): RelayStatusContextValue {
  const context = useContext(RelayStatusContext);
  if (!context) {
    throw new Error('useRelayStatus must be used within RelayStatusProvider');
  }
  return context;
}
