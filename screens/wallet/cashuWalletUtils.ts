import { Platform } from 'react-native';
import {
  NDKCashuWallet,
  NDKKind,
  NDKWalletStatus,
  type NDKWalletBalance,
} from '@nostr-dev-kit/mobile';

import { ndk } from '@lib/ndk';
import { DEFAULT_RELAYS, loadRelays } from '@lib/relay/storage';

import { balanceAmount } from './helpers';

type NdkInstance = typeof ndk;
type AsyncError = (error: unknown) => void;

const DEFAULT_ANDROID_DEV_CASHU_MINT_URL = 'http://10.0.2.2:3338';

export function formatError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function resetCashuWalletState(
  setCashuWallet: (wallet: NDKCashuWallet | null) => void,
  setCashuStatus: (status: NDKWalletStatus | undefined) => void,
  setCashuBalance: (balance: number) => void
) {
  setCashuWallet(null);
  setCashuStatus(undefined);
  setCashuBalance(0);
}

export function syncCashuWalletState(
  wallet: NDKCashuWallet,
  setCashuWallet: (wallet: NDKCashuWallet | null) => void,
  setCashuStatus: (status: NDKWalletStatus | undefined) => void,
  setCashuBalance: (balance: number) => void
) {
  setCashuWallet(wallet);
  setCashuStatus(wallet.status);
  setCashuBalance(balanceAmount(wallet.balance));
}

export function bindCashuWalletEvents(
  wallet: NDKCashuWallet,
  setCashuStatus: (status: NDKWalletStatus | undefined) => void,
  setCashuBalance: (balance: number) => void
) {
  const handleReady = () => {
    setCashuStatus(wallet.status);
    setCashuBalance(balanceAmount(wallet.balance));
  };
  const handleBalanceUpdated = (balance?: NDKWalletBalance) => {
    const nextBalance =
      balance == null ? balanceAmount(wallet.balance) : balanceAmount(balance);
    setCashuBalance(nextBalance);
    if (__DEV__) {
      console.log('[Wallet][CashuDebug] event:balance_updated', {
        payloadBalance: balanceAmount(balance),
        walletBalance: balanceAmount(wallet.balance),
        appliedBalance: nextBalance,
      });
    }
  };
  const handleStatusChanged = (status: NDKWalletStatus) => {
    setCashuStatus(status);
  };

  wallet.on('ready', handleReady);
  wallet.on('balance_updated', handleBalanceUpdated);
  wallet.on('status_changed', handleStatusChanged);

  return () => {
    wallet.off('ready', handleReady);
    wallet.off('balance_updated', handleBalanceUpdated);
    wallet.off('status_changed', handleStatusChanged);
  };
}

export async function runWithCashuBusy(
  setBusy: (busy: boolean) => void,
  action: () => Promise<void>,
  onError: AsyncError
): Promise<void> {
  setBusy(true);
  try {
    await action();
  } catch (error) {
    onError(error);
  } finally {
    setBusy(false);
  }
}

export async function fetchCashuWallet(
  ndkInstance: NdkInstance,
  currentPubkey: string
): Promise<NDKCashuWallet | null> {
  const event = await ndkInstance.fetchEvent({
    kinds: [NDKKind.CashuWallet],
    authors: [currentPubkey],
  });

  if (!event) return null;

  const wallet = await NDKCashuWallet.from(event);
  return wallet ?? null;
}

export function parseSatsAmount(rawAmount: string): number | null {
  const amount = Number.parseInt(rawAmount.trim(), 10);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function getInitialCashuCreateMints(): string {
  if (!__DEV__) {
    return '';
  }

  const configuredMintUrl = process.env.EXPO_PUBLIC_CASHU_DEV_MINT_URL?.trim();
  if (configuredMintUrl) {
    return configuredMintUrl;
  }

  return Platform.OS === 'android' ? DEFAULT_ANDROID_DEV_CASHU_MINT_URL : '';
}

export function getInitialCashuCreateRelays(): string {
  return DEFAULT_RELAYS.join('\n');
}

export async function resolveCashuCreateRelays(): Promise<string[]> {
  const savedRelays = await loadRelays();
  if (savedRelays.length > 0) {
    return savedRelays;
  }

  return DEFAULT_RELAYS;
}

export function isValidMintUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://');
}

export function isValidRelayUrl(url: string): boolean {
  return url.startsWith('wss://') || url.startsWith('ws://');
}

export function walletRelayUrls(wallet: NDKCashuWallet): string[] {
  if (!wallet.relaySet) return [];
  return Array.from(wallet.relaySet.relays)
    .map((relay) => relay.url)
    .filter(Boolean);
}
