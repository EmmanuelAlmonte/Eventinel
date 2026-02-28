import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  useNip55,
  NDKNip55Signer,
  useNDKSessionLogin,
  useNDK,
  NDKPrivateKeySigner,
  NDKNip46Signer,
} from '@nostr-dev-kit/mobile';
import type { SignerAppInfo } from 'expo-nip55';

import { showToast } from '@components/ui';

type Nip46Ndk = Parameters<typeof NDKNip46Signer.bunker>[0];

type ValidationResult = {
  level: 'error' | 'warning';
  title: string;
  message: string;
};

function isNip05Identifier(value: string): boolean {
  return value.includes('@') && !value.includes('://');
}

function normalizeInput(value: string): string {
  return value.trim();
}

function openAuthUrl(url: string) {
  Linking.openURL(url).catch(() => {
    showToast.warning('Action required', 'Open the authorization URL in a browser');
  });
}

function validateRemoteSignerInput(rawInput: string): ValidationResult | null {
  const input = normalizeInput(rawInput);

  if (!input) {
    return {
      level: 'warning',
      title: 'Missing Identifier',
      message: 'Please enter a bunker URL or NIP-05 identifier',
    };
  }
  if (input.startsWith('nostrconnect://')) {
    return {
      level: 'warning',
      title: 'Use Nostr Connect',
      message: 'Generate a nostrconnect:// URI below',
    };
  }
  if (!input.startsWith('bunker://') && !isNip05Identifier(input)) {
    return {
      level: 'error',
      title: 'Invalid Identifier',
      message: 'Enter a bunker:// URL or name@domain',
    };
  }
  return null;
}

function validateNostrConnectRelay(rawRelay: string): ValidationResult | null {
  const relay = normalizeInput(rawRelay);

  if (!relay) {
    return {
      level: 'warning',
      title: 'Missing Relay',
      message: 'Please enter a relay URL',
    };
  }

  if (!relay.startsWith('wss://') && !relay.startsWith('ws://')) {
    return {
      level: 'warning',
      title: 'Invalid Relay',
      message: 'Relay URL must start with wss:// or ws://',
    };
  }

  return null;
}

function makeRemoteSigner(ndk: Nip46Ndk, input: string, forceLegacyNip04: boolean): NDKNip46Signer {
  const signer = NDKNip46Signer.bunker(ndk, input);
  signer.on?.('authUrl', openAuthUrl);
  if (forceLegacyNip04 && (signer as any).rpc) {
    (signer as any).rpc.encryptionType = 'nip04';
  }
  return signer;
}

function makeNostrConnectSigner(ndk: Nip46Ndk, relay: string): NDKNip46Signer {
  const signer = NDKNip46Signer.nostrconnect(ndk, relay);
  signer.on?.('authUrl', openAuthUrl);
  return signer;
}

async function withLoadingState(
  setLoading: (isLoading: boolean) => void,
  action: () => Promise<void>,
  onError: (error: unknown) => void
): Promise<void> {
  setLoading(true);
  try {
    await action();
  } catch (error) {
    onError(error);
  } finally {
    setLoading(false);
  }
}

function clearGeneratedKeyState(
  setGeneratedKey: (value: string | null) => void,
  setGeneratedPubkey: (value: string | null) => void,
  setGeneratedSigner: (value: NDKPrivateKeySigner | null) => void
) {
  setGeneratedKey(null);
  setGeneratedPubkey(null);
  setGeneratedSigner(null);
}

export function useLoginMethods() {
  const { ndk } = useNDK();
  const { isAvailable, apps } = useNip55();
  const login = useNDKSessionLogin();
  const [manualKey, setManualKey] = useState('');
  const [remoteSignerInput, setRemoteSignerInput] = useState('');
  const [nostrConnectRelay, setNostrConnectRelay] = useState('');
  const [nostrConnectUri, setNostrConnectUri] = useState<string | null>(null);
  const [nostrConnectSigner, setNostrConnectSigner] = useState<NDKNip46Signer | null>(null);
  const [forceLegacyNip04, setForceLegacyNip04] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatedPubkey, setGeneratedPubkey] = useState<string | null>(null);
  const [generatedSigner, setGeneratedSigner] = useState<NDKPrivateKeySigner | null>(null);

  const runLoginWithLoading = useCallback(
    async (
      action: () => Promise<void>,
      title: string,
      fallback: string,
      preserveError = false
    ) => {
      await withLoadingState(
        setIsLoading,
        action,
        (error) =>
          showToast.error(
            title,
            preserveError ? (error instanceof Error ? error.message : fallback) : fallback
          )
      );
    },
    []
  );

  const handleNip55Login = useCallback(
    async (app: SignerAppInfo) => {
      await runLoginWithLoading(async () => {
        const signer = new NDKNip55Signer(app.packageName);
        await signer.blockUntilReady();
        await login(signer, true);
      }, 'Login Failed', 'NIP-55 login failed', true);
    },
    [login, runLoginWithLoading]
  );

  const handleRemoteSignerLogin = useCallback(async () => {
    const validation = validateRemoteSignerInput(remoteSignerInput);
    if (!validation) {
      if (!ndk) {
        showToast.error('Error', 'NDK not initialized');
        return;
      }
      const trimmed = normalizeInput(remoteSignerInput);

      await runLoginWithLoading(async () => {
        const signer = makeRemoteSigner(ndk, trimmed, forceLegacyNip04);
        await signer.blockUntilReady();
        await login(signer, true);
      }, 'Connection Failed', 'Remote signer connection failed', true);
      return;
    }

    if (validation.level === 'warning') {
      showToast.warning(validation.title, validation.message);
      return;
    }
    showToast.error(validation.title, validation.message);
  }, [forceLegacyNip04, login, ndk, remoteSignerInput, runLoginWithLoading]);

  const handleStartNostrConnect = useCallback(async () => {
    const validation = validateNostrConnectRelay(nostrConnectRelay);
    if (!validation) {
      const relay = normalizeInput(nostrConnectRelay);
      if (!ndk) {
        showToast.error('Error', 'NDK not initialized');
        return;
      }
      try {
        const signer = makeNostrConnectSigner(ndk, relay);
        if (!signer.nostrConnectUri) {
          showToast.error('Failed to generate', 'Unable to build Nostr Connect URI');
          return;
        }
        setNostrConnectSigner(signer);
        setNostrConnectUri(signer.nostrConnectUri);
      } catch (error) {
        showToast.error(
          'Failed to generate',
          error instanceof Error ? error.message : 'Unable to start Nostr Connect flow'
        );
      }
      return;
    }
    if (validation.level === 'warning') {
      showToast.warning(validation.title, validation.message);
      return;
    }
    showToast.error(validation.title, validation.message);
  }, [ndk, nostrConnectRelay]);

  const handleCopyNostrConnect = useCallback(async () => {
    if (!nostrConnectUri) return;
    try {
      await Clipboard.setStringAsync(nostrConnectUri);
      showToast.success('Copied', 'Nostr Connect URI copied');
    } catch {
      showToast.warning('Clipboard unavailable', 'Copy the URI manually');
    }
  }, [nostrConnectUri]);

  const handleOpenNostrConnect = useCallback(async () => {
    if (!nostrConnectUri) return;
    try {
      await Linking.openURL(nostrConnectUri);
    } catch {
      showToast.warning('Open failed', 'Unable to open signer app');
    }
  }, [nostrConnectUri]);

  const handleCompleteNostrConnect = useCallback(async () => {
    if (!nostrConnectSigner) return;
    await runLoginWithLoading(async () => {
      await nostrConnectSigner.blockUntilReady();
      await login(nostrConnectSigner, true);
      setNostrConnectSigner(null);
      setNostrConnectUri(null);
    }, 'Connection Failed', 'Nostr Connect failed', true);
  }, [login, nostrConnectSigner, runLoginWithLoading]);

  const handleManualLogin = useCallback(async () => {
    const key = normalizeInput(manualKey);
    if (!key) {
      showToast.warning('Missing Key', 'Please enter a private key');
      return;
    }
    await runLoginWithLoading(async () => {
      const signer = new NDKPrivateKeySigner(key);
      await signer.user();
      await login(signer, true);
    }, 'Login Failed', 'Please check your key and try again');
  }, [login, manualKey, runLoginWithLoading]);

  const handleGenerateKey = useCallback(async () => {
    try {
      const signer = NDKPrivateKeySigner.generate();
      const nsec = signer.nsec;
      setGeneratedSigner(signer);
      setGeneratedKey(nsec);
      setGeneratedPubkey(signer.npub);

      try {
        await Clipboard.setStringAsync(nsec);
        showToast.success('Copied to clipboard', 'New private key copied');
      } catch {
        showToast.warning('Clipboard unavailable', 'Copy the key manually');
      }
    } catch {
      showToast.error('Key Generation Failed', 'Please try again');
    }
  }, []);

  const handleGeneratedLogin = useCallback(async () => {
    if (!generatedSigner) return;
    await runLoginWithLoading(async () => {
      await login(generatedSigner, true);
      clearGeneratedKeyState(setGeneratedKey, setGeneratedPubkey, setGeneratedSigner);
    }, 'Login Failed', 'Unable to use generated key', false);
  }, [generatedSigner, login, runLoginWithLoading]);

  return {
    isAvailable,
    apps,
    manualKey,
    setManualKey,
    remoteSignerInput,
    setRemoteSignerInput,
    nostrConnectRelay,
    setNostrConnectRelay,
    nostrConnectUri,
    forceLegacyNip04,
    setForceLegacyNip04,
    isLoading,
    generatedKey,
    generatedPubkey,
    handleNip55Login,
    handleRemoteSignerLogin,
    handleStartNostrConnect,
    handleCopyNostrConnect,
    handleOpenNostrConnect,
    handleCompleteNostrConnect,
    handleManualLogin,
    handleGenerateKey,
    handleGeneratedLogin,
    dismissGeneratedKey: () => {
      clearGeneratedKeyState(setGeneratedKey, setGeneratedPubkey, setGeneratedSigner);
    },
    dismissNostrConnect: () => {
      setNostrConnectSigner(null);
      setNostrConnectUri(null);
    },
  };
}
