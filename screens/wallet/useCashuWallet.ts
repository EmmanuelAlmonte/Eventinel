import { useCallback, useEffect, useState } from 'react';
import {
  NDKCashuWallet,
  NDKKind,
  NDKWalletStatus,
  type NDKWalletBalance,
} from '@nostr-dev-kit/mobile';

import { showToast } from '@components/ui';
import { ndk } from '@lib/ndk';

import { balanceAmount, splitUrls } from './helpers';

export function useCashuWallet(currentPubkey?: string) {
  const [cashuWallet, setCashuWallet] = useState<NDKCashuWallet | null>(null);
  const [cashuStatus, setCashuStatus] = useState<NDKWalletStatus | undefined>(undefined);
  const [cashuBalance, setCashuBalance] = useState(0);
  const [cashuBusy, setCashuBusy] = useState(false);
  const [cashuCreateMints, setCashuCreateMints] = useState('');
  const [cashuCreateRelays, setCashuCreateRelays] = useState('');
  const [cashuDepositAmount, setCashuDepositAmount] = useState('');
  const [cashuDepositInvoice, setCashuDepositInvoice] = useState<string | null>(null);
  const [cashuReceiveToken, setCashuReceiveToken] = useState('');

  const refreshCashuWallet = useCallback(async () => {
    if (!currentPubkey) return;

    setCashuBusy(true);
    try {
      const event = await ndk.fetchEvent({
        kinds: [NDKKind.CashuWallet],
        authors: [currentPubkey],
      });

      if (!event) {
        setCashuWallet(null);
        setCashuStatus(undefined);
        setCashuBalance(0);
        return;
      }

      const wallet = await NDKCashuWallet.from(event);
      if (!wallet) {
        setCashuWallet(null);
        setCashuStatus(undefined);
        setCashuBalance(0);
        return;
      }

      setCashuWallet(wallet);
      setCashuStatus(wallet.status);
      setCashuBalance(balanceAmount(wallet.balance));

      await wallet.start();
      await wallet.updateBalance?.();
      setCashuStatus(wallet.status);
      setCashuBalance(balanceAmount(wallet.balance));
    } catch (error) {
      console.warn('[Wallet] Failed to refresh Cashu wallet:', error);
      showToast.error('Failed to load Cashu wallet', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCashuBusy(false);
    }
  }, [currentPubkey]);

  useEffect(() => {
    refreshCashuWallet();
  }, [refreshCashuWallet]);

  useEffect(() => {
    if (!cashuWallet) return;

    const handleReady = () => {
      setCashuStatus(cashuWallet.status);
      setCashuBalance(balanceAmount(cashuWallet.balance));
    };
    const handleBalanceUpdated = (balance?: NDKWalletBalance) => {
      setCashuBalance(balanceAmount(balance));
    };
    const handleStatusChanged = (status: NDKWalletStatus) => {
      setCashuStatus(status);
    };

    cashuWallet.on('ready', handleReady);
    cashuWallet.on('balance_updated', handleBalanceUpdated);
    cashuWallet.on('status_changed', handleStatusChanged);

    return () => {
      cashuWallet.off('ready', handleReady);
      cashuWallet.off('balance_updated', handleBalanceUpdated);
      cashuWallet.off('status_changed', handleStatusChanged);
    };
  }, [cashuWallet]);

  const handleCreateCashuWallet = useCallback(async () => {
    const mints = splitUrls(cashuCreateMints);
    if (mints.length === 0) {
      showToast.error('Add at least one mint URL');
      return;
    }
    const relays = splitUrls(cashuCreateRelays);

    setCashuBusy(true);
    try {
      const wallet = await NDKCashuWallet.create(ndk, mints, relays.length > 0 ? relays : undefined);
      setCashuWallet(wallet);
      setCashuStatus(wallet.status);
      setCashuBalance(balanceAmount(wallet.balance));

      await wallet.start();
      await wallet.updateBalance?.();
      setCashuStatus(wallet.status);
      setCashuBalance(balanceAmount(wallet.balance));

      showToast.success('Cashu wallet created');
    } catch (error) {
      console.warn('[Wallet] Failed to create Cashu wallet:', error);
      showToast.error('Failed to create Cashu wallet', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCashuBusy(false);
    }
  }, [cashuCreateMints, cashuCreateRelays]);

  const handleCashuDeposit = useCallback(async () => {
    if (!cashuWallet) {
      showToast.error('Create or load a Cashu wallet first');
      return;
    }
    const amount = Number.parseInt(cashuDepositAmount.trim(), 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast.error('Enter a valid amount (sats)');
      return;
    }

    setCashuBusy(true);
    try {
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
    } catch (error) {
      console.warn('[Wallet] Cashu deposit failed:', error);
      showToast.error('Failed to create deposit', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCashuBusy(false);
    }
  }, [cashuDepositAmount, cashuWallet]);

  const handleCashuReceiveToken = useCallback(async () => {
    if (!cashuWallet) {
      showToast.error('Create or load a Cashu wallet first');
      return;
    }

    const token = cashuReceiveToken.trim();
    if (!token) {
      showToast.error('Paste a Cashu token');
      return;
    }

    setCashuBusy(true);
    try {
      await cashuWallet.receiveToken(token, 'Manual import');
      await cashuWallet.updateBalance?.();
      setCashuBalance(balanceAmount(cashuWallet.balance));
      setCashuReceiveToken('');
      showToast.success('Token received');
    } catch (error) {
      console.warn('[Wallet] Cashu receive failed:', error);
      showToast.error('Failed to receive token', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCashuBusy(false);
    }
  }, [cashuReceiveToken, cashuWallet]);

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
    cashuReceiveToken,
    setCashuReceiveToken,
    refreshCashuWallet,
    handleCreateCashuWallet,
    handleCashuDeposit,
    handleCashuReceiveToken,
  };
}
