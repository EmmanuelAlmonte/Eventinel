import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { ndk } from '@lib/ndk';
import { normalizeRelayUrl } from '@lib/relay/config';
import { isConnected, isConnecting, getStatusString } from '@lib/relay/status';
import {
  addRelayToStorage,
  removeRelayFromStorage,
  saveRelays,
  DEFAULT_RELAYS,
  LOCAL_RELAYS,
} from '@lib/relay/storage';
import type { RelayInfo } from '../../types/relay';

import { areRelayInfosEqual, formatRelayList, normalizeUrl } from './helpers';

type RelayManagementResult = {
  relayUrl: string;
  setRelayUrl: (value: string) => void;
  relays: RelayInfo[];
  message: string;
  useLocalRelay: boolean;
  isSwitchingRelay: boolean;
  connectedCount: number;
  isError: boolean;
  handleConnect: () => Promise<void>;
  handleDisconnect: (rawUrl: string) => void;
  handleReconnect: (rawUrl: string) => void;
  handleToggleLocalRelay: (nextValue: boolean) => Promise<void>;
};

export function useRelayManagement(): RelayManagementResult {
  const [relayUrl, setRelayUrl] = useState('');
  const [relays, setRelays] = useState<RelayInfo[]>([]);
  const [message, setMessage] = useState('');
  const [useLocalRelay, setUseLocalRelay] = useState(false);
  const [isSwitchingRelay, setIsSwitchingRelay] = useState(false);

  const updateRelays = useCallback(() => {
    const poolRelays = Array.from(ndk.pool.relays.values());
    const relayInfos: RelayInfo[] = poolRelays
      .map((relay) => ({
        url: normalizeRelayUrl(relay.url),
        status: getStatusString(relay.status),
        rawStatus: relay.status,
        isConnected: isConnected(relay.status),
      }))
      .sort((a, b) => a.url.localeCompare(b.url));

    setRelays((previous) => (areRelayInfosEqual(previous, relayInfos) ? previous : relayInfos));
  }, []);

  const getPoolRelayByUrl = useCallback((url: string) => {
    const normalized = normalizeUrl(url);
    for (const relay of ndk.pool.relays.values()) {
      if (normalizeUrl(relay.url) === normalized) {
        return relay;
      }
    }
    return undefined;
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

  const normalizedLocalRelays = useMemo(
    () => LOCAL_RELAYS.map((relay) => normalizeUrl(relay)),
    []
  );

  useEffect(() => {
    if (!__DEV__) return;
    if (relays.length === 0) {
      setUseLocalRelay(false);
      return;
    }

    const relayUrls = relays.map((relay) => normalizeUrl(relay.url));
    const isLocal =
      relayUrls.length === normalizedLocalRelays.length &&
      normalizedLocalRelays.every((relay) => relayUrls.includes(relay));

    setUseLocalRelay(isLocal);
  }, [relays, normalizedLocalRelays]);

  const applyRelayList = useCallback(
    async (relayUrls: string[], statusMessage: string) => {
      const normalized = [...new Set(relayUrls.map((relay) => normalizeUrl(relay)))];
      if (normalized.length === 0) {
        setMessage('Relay list is empty');
        return;
      }

      const poolRelays = Array.from(ndk.pool.relays.values());
      const poolNormalized = new Set(poolRelays.map((relay) => normalizeUrl(relay.url)));

      for (const relay of poolRelays) {
        if (!normalized.includes(normalizeUrl(relay.url))) {
          ndk.pool.removeRelay(relay.url);
        }
      }

      for (const url of normalized) {
        if (!poolNormalized.has(url)) {
          ndk.addExplicitRelay(url);
        }
      }

      await saveRelays(normalized);
      ndk.connect().catch((error) => console.warn('⚠️ [Relay] Relay connection warning:', error));
      updateRelays();
      setMessage(statusMessage);
    },
    [updateRelays]
  );

  const handleToggleLocalRelay = useCallback(
    async (nextValue: boolean) => {
      if (isSwitchingRelay) return;
      setIsSwitchingRelay(true);
      try {
        if (nextValue) {
          await applyRelayList(LOCAL_RELAYS, `Using local relay: ${formatRelayList(LOCAL_RELAYS)}`);
        } else {
          await applyRelayList(DEFAULT_RELAYS, `Using default relay: ${formatRelayList(DEFAULT_RELAYS)}`);
        }
        setUseLocalRelay(nextValue);
      } catch (error) {
        console.error('[Relay] Failed to switch relay mode:', error);
        setMessage(`Failed to switch relays: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsSwitchingRelay(false);
      }
    },
    [applyRelayList, isSwitchingRelay]
  );

  const handleConnect = useCallback(async () => {
    const trimmed = relayUrl.trim();
    if (!trimmed) {
      setMessage('Please enter a relay URL');
      return;
    }
    if (!trimmed.startsWith('wss://') && !trimmed.startsWith('ws://')) {
      setMessage('Relay URL must start with wss:// or ws://');
      return;
    }

    const url = trimmed;
    console.log('[Relay] User adding relay:', url);
    setMessage(`Connecting to ${url}...`);

    try {
      console.log('[Relay] Adding to NDK pool:', url);
      const relay = ndk.addExplicitRelay(url);
      const canonicalUrl = normalizeUrl(relay.url);

      console.log('[Relay] Saving to storage:', canonicalUrl);
      await addRelayToStorage(canonicalUrl);

      console.log('[Relay] Initiating connection:', canonicalUrl);
      relay.connect();

      setTimeout(() => {
        const poolRelay = getPoolRelayByUrl(canonicalUrl);
        if (poolRelay && isConnected(poolRelay.status)) {
          console.log('[Relay] Connection successful:', canonicalUrl, 'status:', poolRelay.status);
          setMessage(`Connected to ${canonicalUrl}`);
          return;
        }

        if (poolRelay) {
          const status = getStatusString(poolRelay.status);
          console.warn('[Relay] Connection not established:', canonicalUrl, 'status:', status, 'rawStatus:', poolRelay.status);
          setMessage(`Added ${canonicalUrl} (${status})`);
          return;
        }

        console.warn('[Relay] Relay not in pool:', canonicalUrl);
        setMessage(`Added ${canonicalUrl} - attempting connection...`);
      }, 2000);

      setRelayUrl('');
    } catch (error) {
      console.error('[Relay] Failed to add relay:', url, error);
      setMessage(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [getPoolRelayByUrl, relayUrl]);

  const handleDisconnect = useCallback(
    (rawUrl: string) => {
      const url = normalizeUrl(rawUrl);
      Alert.alert('Disconnect Relay', `Remove ${url}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Relay] User removing relay:', url);
              const poolRelay = getPoolRelayByUrl(url);
              const poolUrl = poolRelay?.url ?? url;
              console.log('[Relay] Removing from NDK pool:', poolUrl);
              ndk.pool.removeRelay(poolUrl);

              console.log('[Relay] Removing from storage:', url);
              await removeRelayFromStorage(url);

              console.log('[Relay] Successfully removed:', url);
              setMessage(`Removed ${url}`);
            } catch (error) {
              console.error('[Relay] Failed to remove:', url, error);
              setMessage(`Failed to remove: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          },
        },
      ]);
    },
    [getPoolRelayByUrl]
  );

  const handleReconnect = useCallback(
    (rawUrl: string) => {
      const url = normalizeUrl(rawUrl);
      setMessage(`Reconnecting to ${url}...`);
      try {
        const relay = getPoolRelayByUrl(url) ?? ndk.addExplicitRelay(url);
        relay.connect();
      } catch (error) {
        console.error('[Relay] Failed to reconnect:', url, error);
        setMessage(`Failed to reconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [getPoolRelayByUrl]
  );

  const connectedCount = relays.filter((relay) => relay.isConnected).length;
  const isError =
    message.includes('Failed') ||
    message.includes('must start') ||
    message.includes('Please enter') ||
    message.includes('Relay list is empty');

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[RelayScreen] Relays updated:', relays.length);
    const urls = relays.map((relay) => relay.url);
    const uniqueUrls = new Set(urls);
    if (urls.length !== uniqueUrls.size) {
      console.error('[RelayScreen] ⚠️ DUPLICATE RELAY URLS DETECTED!');
      console.error('[RelayScreen] Duplicates:', urls.filter((url, index) => urls.indexOf(url) !== index));
    }
  }, [relays]);

  return {
    relayUrl,
    setRelayUrl,
    relays,
    message,
    useLocalRelay,
    isSwitchingRelay,
    connectedCount,
    isError,
    handleConnect,
    handleDisconnect,
    handleReconnect,
    handleToggleLocalRelay,
  };
}
