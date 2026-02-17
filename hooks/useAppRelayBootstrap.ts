import { useEffect, useState } from 'react';

import { ndk } from '@lib/ndk';
import { DEFAULT_RELAYS, loadRelays } from '@lib/relay/storage';
import { normalizeRelayUrl } from '@lib/relay/config';

type PoolRelayLike = {
  url: string;
  connect?: () => void;
};

type PoolRelaysSource = {
  relays?: {
    values?: () => Iterable<unknown>;
  };
};

const RELAY_LOAD_TIMEOUT_MS = __DEV__ ? 5000 : 2500;

const isPoolRelayLike = (relay: unknown): relay is PoolRelayLike => {
  if (!relay || typeof relay !== 'object') {
    return false;
  }

  const value = relay as { url?: unknown };
  return typeof value.url === 'string';
};

const getPoolRelays = (): PoolRelayLike[] => {
  const relaysMap = (ndk.pool as PoolRelaysSource | undefined)?.relays;
  if (!relaysMap?.values) {
    return [];
  }

  return Array.from(relaysMap.values()).filter(isPoolRelayLike);
};

const getPoolRelayByUrl = (url: string): PoolRelayLike | undefined => {
  const normalized = normalizeRelayUrl(url);
  for (const relay of getPoolRelays()) {
    if (normalizeRelayUrl(relay.url) === normalized) {
      return relay;
    }
  }

  return undefined;
};

const addRelaysToPool = (urls: string[]) => {
  for (const url of urls) {
    const normalized = normalizeRelayUrl(url);
    if (!getPoolRelayByUrl(normalized)) {
      ndk.addExplicitRelay(normalized);
    }
  }
};

export function useAppRelayBootstrap() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let didProceed = false;
    let didStartConnect = false;

    const connectPoolOnce = () => {
      if (didStartConnect) {
        return;
      }

      didStartConnect = true;
      ndk.connect().catch((err) => console.warn('⚠️ [App] Relay connection warning:', err));
    };

    const proceedWithRelays = (urls: string[], source: string) => {
      if (isCancelled) {
        return;
      }

      if (!didProceed) {
        didProceed = true;

        console.log(`📥 [App] Using ${urls.length} relays (${source}):`, urls);
        if (urls.length === 0) {
          console.warn('⚠️ [App] No relays available. Add relays in Profile > Relay Settings.');
        }

        addRelaysToPool(urls);
        connectPoolOnce();

        setIsReady(true);
        console.log('✅ [App] UI ready, relays connecting...');
        return;
      }

      const missing = urls.filter((url) => !getPoolRelayByUrl(url));
      if (missing.length > 0) {
        console.log(`➕ [App] Adding ${missing.length} relays (${source}):`, missing);
        addRelaysToPool(missing);
        for (const url of missing) {
          getPoolRelayByUrl(url)?.connect?.();
        }
      }
    };

    console.log('🚀 [App] Initializing relay connections...');
    const timeoutId = setTimeout(() => {
      console.warn(
        `⏰ [App] loadRelays() timed out after ${RELAY_LOAD_TIMEOUT_MS}ms; starting with defaults`
      );
      proceedWithRelays(DEFAULT_RELAYS, 'timeout-defaults');
    }, RELAY_LOAD_TIMEOUT_MS);

    loadRelays()
      .then((savedRelays) => {
        clearTimeout(timeoutId);
        proceedWithRelays(savedRelays, 'storage');
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.error('❌ [App] Failed to load relays:', error);
        proceedWithRelays(DEFAULT_RELAYS, 'storage-error-defaults');
      });

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return isReady;
}

