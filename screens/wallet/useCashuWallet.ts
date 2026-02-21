import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  NDKCashuWallet,
  NDKKind,
  NDKWalletStatus,
  type NDKWalletBalance,
} from '@nostr-dev-kit/mobile';

import { showToast } from '@components/ui';
import { ndk } from '@lib/ndk';

import { balanceAmount, splitUrls } from './helpers';

type NdkInstance = typeof ndk;

type AsyncError = (error: unknown) => void;

function formatError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function resetCashuWalletState(
  setCashuWallet: (wallet: NDKCashuWallet | null) => void,
  setCashuStatus: (status: NDKWalletStatus | undefined) => void,
  setCashuBalance: (balance: number) => void
) {
  setCashuWallet(null);
  setCashuStatus(undefined);
  setCashuBalance(0);
}

function syncCashuWalletState(
  wallet: NDKCashuWallet,
  setCashuWallet: (wallet: NDKCashuWallet | null) => void,
  setCashuStatus: (status: NDKWalletStatus | undefined) => void,
  setCashuBalance: (balance: number) => void
) {
  setCashuWallet(wallet);
  setCashuStatus(wallet.status);
  setCashuBalance(balanceAmount(wallet.balance));
}

function bindCashuWalletEvents(
  wallet: NDKCashuWallet,
  setCashuStatus: (status: NDKWalletStatus | undefined) => void,
  setCashuBalance: (balance: number) => void
) {
  const handleReady = () => {
    setCashuStatus(wallet.status);
    setCashuBalance(balanceAmount(wallet.balance));
  };
  const handleBalanceUpdated = (balance?: NDKWalletBalance) => {
    setCashuBalance(balanceAmount(balance));
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

async function runWithCashuBusy(
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

async function fetchCashuWallet(ndk: NdkInstance, currentPubkey: string): Promise<NDKCashuWallet | null> {
  const event = await ndk.fetchEvent({
    kinds: [NDKKind.CashuWallet],
    authors: [currentPubkey],
  });

  if (!event) return null;

  const wallet = await NDKCashuWallet.from(event);
  return wallet ?? null;
}

function parseSatsAmount(rawAmount: string): number | null {
  const amount = Number.parseInt(rawAmount.trim(), 10);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

const DEFAULT_ANDROID_DEV_CASHU_MINT_URL = 'http://10.0.2.2:3338';
const FIXED_CASHU_WALLET_RELAY_URL = 'wss://relay.eventinel.com';

function getInitialCashuCreateMints(): string {
  if (!__DEV__) {
    return '';
  }

  const configuredMintUrl = process.env.EXPO_PUBLIC_CASHU_DEV_MINT_URL?.trim();
  if (configuredMintUrl) {
    return configuredMintUrl;
  }

  return Platform.OS === 'android' ? DEFAULT_ANDROID_DEV_CASHU_MINT_URL : '';
}

export function useCashuWallet(currentPubkey?: string, enabled = true) {
  const [cashuWallet, setCashuWallet] = useState<NDKCashuWallet | null>(null);
  const [cashuStatus, setCashuStatus] = useState<NDKWalletStatus | undefined>(undefined);
  const [cashuBalance, setCashuBalance] = useState(0);
  const [cashuBusy, setCashuBusy] = useState(false);
  const [cashuCreateMints, setCashuCreateMints] = useState(getInitialCashuCreateMints);
  const [cashuCreateRelays, setCashuCreateRelays] = useState(FIXED_CASHU_WALLET_RELAY_URL);
  const [cashuDepositAmount, setCashuDepositAmount] = useState('');
  const [cashuDepositInvoice, setCashuDepositInvoice] = useState<string | null>(null);
  const [cashuEditMints, setCashuEditMints] = useState('');
  const [cashuSendAmount, setCashuSendAmount] = useState('');
  const [cashuSendToken, setCashuSendToken] = useState<string | null>(null);
  const [cashuReceiveToken, setCashuReceiveToken] = useState('');

  const refreshCashuWallet = useCallback(async () => {
    if (!enabled || !currentPubkey) return;
    await runWithCashuBusy(
      setCashuBusy,
      async () => {
        const wallet = await fetchCashuWallet(ndk, currentPubkey);
        if (!wallet) {
          resetCashuWalletState(setCashuWallet, setCashuStatus, setCashuBalance);
          setCashuEditMints('');
          return;
        }

        syncCashuWalletState(wallet, setCashuWallet, setCashuStatus, setCashuBalance);
        await wallet.start();
        await wallet.updateBalance?.();
        setCashuStatus(wallet.status);
        setCashuBalance(balanceAmount(wallet.balance));
        setCashuEditMints(wallet.mints.join('\n'));
      },
      (error) => {
        console.warn('[Wallet] Failed to refresh Cashu wallet:', error);
        showToast.error('Failed to load Cashu wallet', formatError(error, 'Unknown error'));
      }
    );
  }, [currentPubkey, enabled]);

  useEffect(() => {
    if (!enabled) {
      resetCashuWalletState(setCashuWallet, setCashuStatus, setCashuBalance);
      setCashuEditMints('');
      return;
    }
    refreshCashuWallet();
  }, [enabled, refreshCashuWallet]);

  useEffect(() => {
    if (!enabled || !cashuWallet) return;
    return bindCashuWalletEvents(cashuWallet, setCashuStatus, setCashuBalance);
  }, [cashuWallet, enabled]);

  const handleCreateCashuWallet = useCallback(async () => {
    if (!enabled) {
      showToast.error('Cashu wallet is disabled in this build');
      return;
    }

    const mints = splitUrls(cashuCreateMints);
    if (!mints.length) {
      showToast.error('Add at least one mint URL');
      return;
    }
    await runWithCashuBusy(
      setCashuBusy,
      async () => {
        const wallet = await NDKCashuWallet.create(ndk, mints, [FIXED_CASHU_WALLET_RELAY_URL]);
        if (!wallet) {
          throw new Error('Wallet creation returned empty response');
        }
        syncCashuWalletState(wallet, setCashuWallet, setCashuStatus, setCashuBalance);
        await wallet.start();
        await wallet.updateBalance?.();
        setCashuStatus(wallet.status);
        setCashuBalance(balanceAmount(wallet.balance));
        setCashuEditMints(wallet.mints.join('\n'));
        showToast.success('Cashu wallet created');
      },
      (error) => {
        console.warn('[Wallet] Failed to create Cashu wallet:', error);
        showToast.error('Failed to create Cashu wallet', formatError(error, 'Unknown error'));
      }
    );
  }, [cashuCreateMints, enabled]);

  const handleCashuDeposit = useCallback(async () => {
    if (!enabled) {
      showToast.error('Cashu wallet is disabled in this build');
      return;
    }

    if (!cashuWallet) {
      showToast.error('Create or load a Cashu wallet first');
      return;
    }
    const amount = parseSatsAmount(cashuDepositAmount);
    if (amount == null) {
      showToast.error('Enter a valid amount (sats)');
      return;
    }

    await runWithCashuBusy(
      setCashuBusy,
      async () => {
        const deposit = cashuWallet.deposit(amount);
        deposit.on('success', () => {
          showToast.success('Deposit confirmed');
          setCashuDepositInvoice(null);
        });
        deposit.on('error', (message) => {
          showToast.error('Deposit failed', message);
        });

        const invoice = await deposit.start();
        setCashuDepositInvoice(invoice);
        showToast.success('Deposit invoice created');
      },
      (error) => {
        console.warn('[Wallet] Cashu deposit failed:', error);
        showToast.error('Failed to create deposit', formatError(error, 'Unknown error'));
      }
    );
  }, [cashuDepositAmount, cashuWallet, enabled]);

  const handleCashuReceiveToken = useCallback(async () => {
    if (!enabled) {
      showToast.error('Cashu wallet is disabled in this build');
      return;
    }

    if (!cashuWallet) {
      showToast.error('Create or load a Cashu wallet first');
      return;
    }

    const token = cashuReceiveToken.trim();
    if (!token) {
      showToast.error('Paste a Cashu token');
      return;
    }

    await runWithCashuBusy(
      setCashuBusy,
      async () => {
        await cashuWallet.receiveToken(token, 'Manual import');
        await cashuWallet.updateBalance?.();
        setCashuBalance(balanceAmount(cashuWallet.balance));
        setCashuReceiveToken('');
        showToast.success('Token received');
      },
      (error) => {
        console.warn('[Wallet] Cashu receive failed:', error);
        showToast.error('Failed to receive token', formatError(error, 'Unknown error'));
      }
    );
  }, [cashuReceiveToken, cashuWallet, enabled]);

  const handleCashuSendToken = useCallback(async () => {
    if (!enabled) {
      showToast.error('Cashu wallet is disabled in this build');
      return;
    }

    if (!cashuWallet) {
      showToast.error('Create or load a Cashu wallet first');
      return;
    }

    const amount = parseSatsAmount(cashuSendAmount);
    if (amount == null) {
      showToast.error('Enter a valid send amount (sats)');
      return;
    }

    if (amount > cashuBalance) {
      showToast.error('Insufficient balance', `Available: ${cashuBalance} sats`);
      return;
    }

    await runWithCashuBusy(
      setCashuBusy,
      async () => {
        const token = await cashuWallet.send(amount, 'Eventinel transfer');
        if (!token.trim()) {
          throw new Error('Send returned an empty token');
        }

        setCashuSendToken(token);
        setCashuSendAmount('');
        await cashuWallet.updateBalance?.();
        setCashuBalance(balanceAmount(cashuWallet.balance));
        showToast.success('Token created');
      },
      (error) => {
        console.warn('[Wallet] Cashu send failed:', error);
        showToast.error('Failed to create token', formatError(error, 'Unknown error'));
      }
    );
  }, [cashuBalance, cashuSendAmount, cashuWallet, enabled]);

  const handleCashuUpdateMints = useCallback(async () => {
    if (!enabled) {
      showToast.error('Cashu wallet is disabled in this build');
      return;
    }

    if (!cashuWallet) {
      showToast.error('Create or load a Cashu wallet first');
      return;
    }

    const mints = Array.from(new Set(splitUrls(cashuEditMints)));
    if (!mints.length) {
      showToast.error('Add at least one valid mint URL');
      return;
    }

    await runWithCashuBusy(
      setCashuBusy,
      async () => {
        await cashuWallet.update({ mints, relays: [FIXED_CASHU_WALLET_RELAY_URL] });
        setCashuEditMints(mints.join('\n'));
        await cashuWallet.updateBalance?.();
        syncCashuWalletState(cashuWallet, setCashuWallet, setCashuStatus, setCashuBalance);
        showToast.success('Wallet mints updated');
      },
      (error) => {
        console.warn('[Wallet] Cashu mint update failed:', error);
        showToast.error('Failed to update mints', formatError(error, 'Unknown error'));
      }
    );
  }, [cashuEditMints, cashuWallet, enabled]);

  return {
    cashuWallet,
    cashuStatus,
    cashuBalance,
    cashuBusy,
    cashuCreateMints,
    setCashuCreateMints,
    cashuCreateRelays,
    setCashuCreateRelays,
    cashuDepositAmount,
    setCashuDepositAmount,
    cashuDepositInvoice,
    cashuEditMints,
    setCashuEditMints,
    cashuSendAmount,
    setCashuSendAmount,
    cashuSendToken,
    cashuReceiveToken,
    setCashuReceiveToken,
    refreshCashuWallet,
    handleCreateCashuWallet,
    handleCashuDeposit,
    handleCashuUpdateMints,
    handleCashuSendToken,
    handleCashuReceiveToken,
  };
}
