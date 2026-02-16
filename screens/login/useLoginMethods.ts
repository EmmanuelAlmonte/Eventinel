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

function isNip05Identifier(value: string): boolean {
  return value.includes('@') && !value.includes('://');
}

function openAuthUrl(url: string) {
  Linking.openURL(url).catch(() => {
    showToast.warning('Action required', 'Open the authorization URL in a browser');
  });
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

  const handleNip55Login = useCallback(
    async (app: SignerAppInfo) => {
      setIsLoading(true);
      try {
        const signer = new NDKNip55Signer(app.packageName);
        await signer.blockUntilReady();
        await login(signer, true);
      } catch (error) {
        showToast.error('Login Failed', error instanceof Error ? error.message : 'NIP-55 login failed');
      } finally {
        setIsLoading(false);
      }
    },
    [login]
  );

  const handleRemoteSignerLogin = useCallback(async () => {
    const trimmed = remoteSignerInput.trim();
    if (!trimmed) {
      showToast.warning('Missing Identifier', 'Please enter a bunker URL or NIP-05 identifier');
      return;
    }
    if (trimmed.startsWith('nostrconnect://')) {
      showToast.warning('Use Nostr Connect', 'Generate a nostrconnect:// URI below');
      return;
    }
    if (!trimmed.startsWith('bunker://') && !isNip05Identifier(trimmed)) {
      showToast.error('Invalid Identifier', 'Enter a bunker:// URL or name@domain');
      return;
    }
    if (!ndk) {
      showToast.error('Error', 'NDK not initialized');
      return;
    }

    setIsLoading(true);
    try {
      const signer = NDKNip46Signer.bunker(ndk, trimmed);
      signer.on?.('authUrl', openAuthUrl);
      if (forceLegacyNip04 && (signer as any).rpc) {
        (signer as any).rpc.encryptionType = 'nip04';
      }
      await signer.blockUntilReady();
      await login(signer, true);
    } catch (error) {
      showToast.error(
        'Connection Failed',
        error instanceof Error ? error.message : 'Remote signer connection failed'
      );
    } finally {
      setIsLoading(false);
    }
  }, [forceLegacyNip04, login, ndk, remoteSignerInput]);

  const handleStartNostrConnect = useCallback(async () => {
    const relay = nostrConnectRelay.trim();
    if (!relay) {
      showToast.warning('Missing Relay', 'Please enter a relay URL');
      return;
    }
    if (!relay.startsWith('wss://') && !relay.startsWith('ws://')) {
      showToast.warning('Invalid Relay', 'Relay URL must start with wss:// or ws://');
      return;
    }
    if (!ndk) {
      showToast.error('Error', 'NDK not initialized');
      return;
    }

    try {
      const signer = NDKNip46Signer.nostrconnect(ndk, relay);
      signer.on?.('authUrl', openAuthUrl);
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
    setIsLoading(true);
    try {
      await nostrConnectSigner.blockUntilReady();
      await login(nostrConnectSigner, true);
      setNostrConnectSigner(null);
      setNostrConnectUri(null);
    } catch (error) {
      showToast.error('Connection Failed', error instanceof Error ? error.message : 'Nostr Connect failed');
    } finally {
      setIsLoading(false);
    }
  }, [login, nostrConnectSigner]);

  const handleManualLogin = useCallback(async () => {
    if (!manualKey.trim()) {
      showToast.warning('Missing Key', 'Please enter a private key');
      return;
    }

    setIsLoading(true);
    try {
      const signer = new NDKPrivateKeySigner(manualKey.trim());
      await signer.user();
      await login(signer, true);
    } catch {
      showToast.error('Login Failed', 'Please check your key and try again');
    } finally {
      setIsLoading(false);
    }
  }, [login, manualKey]);

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
    setIsLoading(true);
    try {
      await login(generatedSigner, true);
      setGeneratedKey(null);
      setGeneratedPubkey(null);
      setGeneratedSigner(null);
    } catch {
      showToast.error('Login Failed', 'Unable to use generated key');
    } finally {
      setIsLoading(false);
    }
  }, [generatedSigner, login]);

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
      setGeneratedKey(null);
      setGeneratedPubkey(null);
      setGeneratedSigner(null);
    },
    dismissNostrConnect: () => {
      setNostrConnectSigner(null);
      setNostrConnectUri(null);
    },
  };
}
