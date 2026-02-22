import { useCallback, useEffect, useState } from 'react';
import { NDKCashuWallet, NDKWalletStatus } from '@nostr-dev-kit/mobile';

import { showToast } from '@components/ui';
import { ndk } from '@lib/ndk';

import { balanceAmount, splitUrls } from './helpers';
import {
  logCashuDebug,
  logCashuTx,
  publishMintListBestEffort,
  tokenMeta,
} from './cashuWalletLogging';
import {
  bindCashuWalletEvents,
  fetchCashuWallet,
  formatError,
  getInitialCashuCreateRelays,
  getInitialCashuCreateMints,
  isValidMintUrl,
  isValidRelayUrl,
  parseSatsAmount,
  resetCashuWalletState,
  resolveCashuCreateRelays,
  runWithCashuBusy,
  syncCashuWalletState,
  walletRelayUrls,
} from './cashuWalletUtils';

export function useCashuWallet(currentPubkey?: string, enabled = true) {
  const [cashuWallet, setCashuWallet] = useState<NDKCashuWallet | null>(null);
  const [cashuStatus, setCashuStatus] = useState<NDKWalletStatus | undefined>(undefined);
  const [cashuBalance, setCashuBalance] = useState(0);
  const [cashuBusy, setCashuBusy] = useState(false);
  const [cashuCreateMints, setCashuCreateMints] = useState(getInitialCashuCreateMints);
  const [cashuCreateRelays, setCashuCreateRelays] = useState(getInitialCashuCreateRelays);
  const [cashuDepositAmount, setCashuDepositAmount] = useState('');
  const [cashuDepositInvoice, setCashuDepositInvoice] = useState<string | null>(null);
  const [cashuEditMints, setCashuEditMints] = useState('');
  const [cashuEditRelays, setCashuEditRelays] = useState('');
  const [cashuSendAmount, setCashuSendAmount] = useState('');
  const [cashuSendToken, setCashuSendToken] = useState<string | null>(null);
  const [cashuReceiveToken, setCashuReceiveToken] = useState('');

  const refreshCashuWallet = useCallback(async () => {
    if (!enabled || !currentPubkey) return;
    await runWithCashuBusy(
      setCashuBusy,
      async () => {
        logCashuDebug('refresh:start', { pubkey: currentPubkey });
        const wallet = await fetchCashuWallet(ndk, currentPubkey);
        if (!wallet) {
          logCashuDebug('refresh:no-wallet-event', { pubkey: currentPubkey });
          resetCashuWalletState(setCashuWallet, setCashuStatus, setCashuBalance);
          setCashuEditMints('');
          setCashuEditRelays('');
          return;
        }

        logCashuDebug('refresh:fetched-wallet', {
          status: wallet.status,
          balance: balanceAmount(wallet.balance),
          mints: wallet.mints,
          relays: walletRelayUrls(wallet),
        });
        setCashuWallet(wallet);
        setCashuStatus(wallet.status);
        logCashuDebug('refresh:after-wallet-set', {
          status: wallet.status,
          balance: balanceAmount(wallet.balance),
        });

        await wallet.start();
        logCashuDebug('refresh:after-start', {
          status: wallet.status,
          balance: balanceAmount(wallet.balance),
        });

        await wallet.updateBalance?.();
        logCashuDebug('refresh:after-updateBalance', {
          status: wallet.status,
          balance: balanceAmount(wallet.balance),
        });

        syncCashuWalletState(wallet, setCashuWallet, setCashuStatus, setCashuBalance);
        setCashuEditMints(wallet.mints.join('\n'));
        setCashuEditRelays(walletRelayUrls(wallet).join('\n'));
        logCashuDebug('refresh:done', {
          status: wallet.status,
          balance: balanceAmount(wallet.balance),
          mints: wallet.mints,
          relays: walletRelayUrls(wallet),
        });
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
      setCashuEditRelays('');
      return;
    }
    refreshCashuWallet();
  }, [enabled, refreshCashuWallet]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    resolveCashuCreateRelays()
      .then((relays) => {
        if (cancelled) return;
        setCashuCreateRelays(relays.join('\n'));
      })
      .catch((error) => {
        console.warn('[Wallet] Failed to resolve Cashu create relays:', error);
        if (!cancelled) {
          setCashuCreateRelays(getInitialCashuCreateRelays());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

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
        const relays = await resolveCashuCreateRelays();
        logCashuTx('create_wallet', 'start', {
          mintCount: mints.length,
          relayCount: relays.length,
        });
        const wallet = await NDKCashuWallet.create(ndk, mints, relays);
        if (!wallet) {
          throw new Error('Wallet creation returned empty response');
        }
        syncCashuWalletState(wallet, setCashuWallet, setCashuStatus, setCashuBalance);
        await wallet.start();
        await wallet.updateBalance?.();
        await publishMintListBestEffort(wallet, 'create');
        setCashuStatus(wallet.status);
        setCashuBalance(balanceAmount(wallet.balance));
        setCashuEditMints(wallet.mints.join('\n'));
        setCashuEditRelays(walletRelayUrls(wallet).join('\n'));
        setCashuCreateRelays(relays.join('\n'));
        logCashuTx('create_wallet', 'success', {
          balance: balanceAmount(wallet.balance),
          status: wallet.status,
          mintCount: wallet.mints.length,
          relayCount: walletRelayUrls(wallet).length,
        });
        showToast.success('Cashu wallet created');
      },
      (error) => {
        console.warn('[Wallet] Failed to create Cashu wallet:', error);
        logCashuTx('create_wallet', 'error', { detail: formatError(error, 'Unknown error') });
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
        logCashuTx('deposit', 'start', { amount });
        const deposit = cashuWallet.deposit(amount);
        deposit.on('success', () => {
          logCashuTx('deposit', 'success', { amount, balance: balanceAmount(cashuWallet.balance) });
          showToast.success('Deposit confirmed');
          setCashuDepositInvoice(null);
        });
        deposit.on('error', (message) => {
          logCashuTx('deposit', 'error', { amount, detail: message });
          showToast.error('Deposit failed', message);
        });

        const invoice = await deposit.start();
        setCashuDepositInvoice(invoice);
        logCashuDebug('tx:deposit:invoice_created', {
          amount,
          invoiceLength: invoice.length,
        });
        if (__DEV__) {
          console.log(`[Wallet] Cashu deposit invoice (${amount} sats):`, invoice);
        }
        showToast.success('Deposit invoice created');
      },
      (error) => {
        console.warn('[Wallet] Cashu deposit failed:', error);
        logCashuTx('deposit', 'error', { amount, detail: formatError(error, 'Unknown error') });
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
        const beforeBalance = balanceAmount(cashuWallet.balance);
        logCashuTx('receive_token', 'start', {
          ...tokenMeta(token),
          beforeBalance,
        });
        await cashuWallet.receiveToken(token, 'Manual import');
        await cashuWallet.updateBalance?.();
        const afterBalance = balanceAmount(cashuWallet.balance);
        setCashuBalance(afterBalance);
        setCashuReceiveToken('');
        logCashuTx('receive_token', 'success', {
          ...tokenMeta(token),
          beforeBalance,
          afterBalance,
        });
        showToast.success('Token received');
      },
      (error) => {
        console.warn('[Wallet] Cashu receive failed:', error);
        logCashuTx('receive_token', 'error', {
          ...tokenMeta(token),
          detail: formatError(error, 'Unknown error'),
        });
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
        const beforeBalance = balanceAmount(cashuWallet.balance);
        logCashuTx('send_token', 'start', { amount, beforeBalance });
        const token = await cashuWallet.send(amount, 'Eventinel transfer');
        if (!token.trim()) {
          throw new Error('Send returned an empty token');
        }

        setCashuSendToken(token);
        setCashuSendAmount('');
        await cashuWallet.updateBalance?.();
        const afterBalance = balanceAmount(cashuWallet.balance);
        setCashuBalance(afterBalance);
        logCashuTx('send_token', 'success', {
          amount,
          ...tokenMeta(token),
          beforeBalance,
          afterBalance,
        });
        showToast.success('Token created');
      },
      (error) => {
        console.warn('[Wallet] Cashu send failed:', error);
        logCashuTx('send_token', 'error', { amount, detail: formatError(error, 'Unknown error') });
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
    if (mints.some((mint) => !isValidMintUrl(mint))) {
      showToast.error('Mint URLs must start with http:// or https://');
      return;
    }

    const relays = Array.from(new Set(splitUrls(cashuEditRelays)));
    if (!relays.length) {
      showToast.error('Add at least one relay URL');
      return;
    }
    if (relays.some((relay) => !isValidRelayUrl(relay))) {
      showToast.error('Relay URLs must start with wss:// or ws://');
      return;
    }

    await runWithCashuBusy(
      setCashuBusy,
      async () => {
        logCashuTx('update_wallet_settings', 'start', {
          requestedMintCount: mints.length,
          requestedRelayCount: relays.length,
        });
        logCashuDebug('settings-save:start', {
          previousBalance: balanceAmount(cashuWallet.balance),
          currentStatus: cashuWallet.status,
          requestedMints: mints,
          requestedRelays: relays,
        });
        await cashuWallet.update({ mints, relays });
        logCashuDebug('settings-save:after-update-call', {
          balance: balanceAmount(cashuWallet.balance),
          status: cashuWallet.status,
        });
        await publishMintListBestEffort(cashuWallet, 'update');
        setCashuEditMints(mints.join('\n'));
        setCashuEditRelays(relays.join('\n'));

        await cashuWallet.updateBalance?.();
        logCashuDebug('settings-save:after-updateBalance', {
          balance: balanceAmount(cashuWallet.balance),
          status: cashuWallet.status,
        });
        syncCashuWalletState(cashuWallet, setCashuWallet, setCashuStatus, setCashuBalance);
        logCashuDebug('settings-save:done', {
          finalBalance: balanceAmount(cashuWallet.balance),
          finalStatus: cashuWallet.status,
          appliedMints: cashuWallet.mints,
          appliedRelays: walletRelayUrls(cashuWallet),
        });
        logCashuTx('update_wallet_settings', 'success', {
          finalBalance: balanceAmount(cashuWallet.balance),
          finalStatus: cashuWallet.status,
          appliedMintCount: cashuWallet.mints.length,
          appliedRelayCount: walletRelayUrls(cashuWallet).length,
        });
        showToast.success('Wallet settings updated');
      },
      (error) => {
        console.warn('[Wallet] Cashu mint update failed:', error);
        logCashuTx('update_wallet_settings', 'error', {
          detail: formatError(error, 'Unknown error'),
        });
        showToast.error('Failed to update wallet settings', formatError(error, 'Unknown error'));
      }
    );
  }, [cashuEditMints, cashuEditRelays, cashuWallet, enabled]);

  const cashuWalletRelays = cashuWallet ? walletRelayUrls(cashuWallet) : [];

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
    cashuEditRelays,
    setCashuEditRelays,
    cashuWalletRelays,
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
