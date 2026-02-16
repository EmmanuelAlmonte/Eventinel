import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  NDKNWCWallet,
  type NDKNWCGetInfoResult,
  type NDKWalletBalance,
  NDKWalletStatus,
} from '@nostr-dev-kit/mobile';

import { showToast } from '@components/ui';
import { ndk } from '@lib/ndk';
import {
  clearNwcPairingCode,
  loadNwcPairingCode,
  saveNwcPairingCode,
} from '@lib/payments/nwcStorage';
import { tryParseNwcUri } from '@lib/payments/nwcUri';

import { balanceAmount } from './helpers';

export function useNwcWallet() {
  const [nwcPairingCodeInput, setNwcPairingCodeInput] = useState('');
  const [nwcWallet, setNwcWallet] = useState<NDKNWCWallet | null>(null);
  const [nwcInfo, setNwcInfo] = useState<NDKNWCGetInfoResult | null>(null);
  const [nwcStatus, setNwcStatus] = useState<NDKWalletStatus | undefined>(undefined);
  const [nwcBalance, setNwcBalance] = useState(0);
  const [nwcBusy, setNwcBusy] = useState(false);
  const [nwcPayInvoice, setNwcPayInvoice] = useState('');
  const [nwcMakeAmount, setNwcMakeAmount] = useState('');
  const [nwcMakeDesc, setNwcMakeDesc] = useState('Eventinel');
  const [nwcCreatedInvoice, setNwcCreatedInvoice] = useState<string | null>(null);

  const nwcConnectionSummary = useMemo(() => {
    if (!nwcWallet?.pairingCode) return null;
    const parsed = tryParseNwcUri(nwcWallet.pairingCode);
    if (!parsed) return null;
    return { pubkey: parsed.pubkey, relays: parsed.relays };
  }, [nwcWallet?.pairingCode]);

  const disconnectNwc = useCallback(async () => {
    setNwcBusy(true);
    try {
      await clearNwcPairingCode();
      const pool = nwcWallet?.pool;
      if (pool) {
        for (const relay of pool.relays.values()) {
          try {
            relay.disconnect();
          } catch {
            // ignore
          }
        }
      }

      setNwcWallet(null);
      setNwcInfo(null);
      setNwcStatus(undefined);
      setNwcBalance(0);
      setNwcCreatedInvoice(null);
      showToast.success('Lightning wallet disconnected');
    } catch (error) {
      console.warn('[Wallet] Failed to disconnect NWC:', error);
      showToast.error('Failed to disconnect', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setNwcBusy(false);
    }
  }, [nwcWallet]);

  const connectNwc = useCallback(
    async (pairingCode: string, opts?: { persist?: boolean }) => {
      const persist = opts?.persist ?? true;
      const parsed = tryParseNwcUri(pairingCode);
      if (!parsed) {
        showToast.error('Invalid NWC pairing code', 'Paste a full nostr+walletconnect:// URI');
        return;
      }

      setNwcBusy(true);
      try {
        if (nwcWallet) {
          await disconnectNwc();
        }

        if (persist) {
          await saveNwcPairingCode(parsed.uri);
        }

        const wallet = new NDKNWCWallet(ndk, {
          pairingCode: parsed.uri,
          timeout: 15000,
        });

        setNwcWallet(wallet);
        setNwcStatus(wallet.status);
        setNwcBalance(balanceAmount(wallet.balance));

        wallet.getInfo(true).then(setNwcInfo).catch((error) => {
          console.warn('[Wallet] NWC getInfo failed:', error);
        });

        wallet
          .updateBalance()
          .then(() => setNwcBalance(balanceAmount(wallet.balance)))
          .catch((error) => console.warn('[Wallet] NWC updateBalance failed:', error));

        showToast.success('Lightning wallet connected');
      } catch (error) {
        console.warn('[Wallet] Failed to connect NWC:', error);
        showToast.error('Failed to connect NWC', error instanceof Error ? error.message : 'Unknown error');
        await clearNwcPairingCode();
      } finally {
        setNwcBusy(false);
      }
    },
    [disconnectNwc, nwcWallet]
  );

  useEffect(() => {
    let isCancelled = false;

    loadNwcPairingCode()
      .then((stored) => {
        if (isCancelled || !stored) return;
        setNwcPairingCodeInput(stored);
        connectNwc(stored, { persist: false });
      })
      .catch((error) => console.warn('[Wallet] Failed to load stored NWC pairing code:', error));

    return () => {
      isCancelled = true;
    };
  }, [connectNwc]);

  useEffect(() => {
    if (!nwcWallet) return;

    const handleReady = () => {
      setNwcStatus(nwcWallet.status);
      setNwcBalance(balanceAmount(nwcWallet.balance));
    };
    const handleBalanceUpdated = (balance?: NDKWalletBalance) => {
      setNwcBalance(balanceAmount(balance));
    };
    const handleStatusChanged = (status: NDKWalletStatus) => {
      setNwcStatus(status);
    };

    nwcWallet.on('ready', handleReady);
    nwcWallet.on('balance_updated', handleBalanceUpdated);
    nwcWallet.on('status_changed', handleStatusChanged);

    return () => {
      nwcWallet.off('ready', handleReady);
      nwcWallet.off('balance_updated', handleBalanceUpdated);
      nwcWallet.off('status_changed', handleStatusChanged);
    };
  }, [nwcWallet]);

  const handleNwcPay = useCallback(async () => {
    if (!nwcWallet) {
      showToast.error('Connect a Lightning wallet first');
      return;
    }
    const invoice = nwcPayInvoice.trim();
    if (!invoice) {
      showToast.error('Paste a BOLT11 invoice');
      return;
    }

    setNwcBusy(true);
    try {
      await nwcWallet.lnPay({ pr: invoice });
      await nwcWallet.updateBalance();
      setNwcBalance(balanceAmount(nwcWallet.balance));
      setNwcPayInvoice('');
      showToast.success('Invoice paid');
    } catch (error) {
      console.warn('[Wallet] NWC pay failed:', error);
      showToast.error('Payment failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setNwcBusy(false);
    }
  }, [nwcPayInvoice, nwcWallet]);

  const handleNwcMakeInvoice = useCallback(async () => {
    if (!nwcWallet) {
      showToast.error('Connect a Lightning wallet first');
      return;
    }
    const amount = Number.parseInt(nwcMakeAmount.trim(), 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast.error('Enter a valid amount (sats)');
      return;
    }

    setNwcBusy(true);
    try {
      const result = await nwcWallet.makeInvoice(amount, nwcMakeDesc.trim() || 'Eventinel');
      setNwcCreatedInvoice(result.invoice);
      showToast.success('Invoice created');
    } catch (error) {
      console.warn('[Wallet] NWC makeInvoice failed:', error);
      showToast.error('Failed to create invoice', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setNwcBusy(false);
    }
  }, [nwcMakeAmount, nwcMakeDesc, nwcWallet]);

  const copyToClipboard = useCallback(async (value: string, label: string) => {
    try {
      await Clipboard.setStringAsync(value);
      showToast.success(`${label} copied`);
    } catch (error) {
      console.warn('[Wallet] Clipboard copy failed:', error);
      showToast.error('Copy failed');
    }
  }, []);

  return {
    nwcPairingCodeInput,
    setNwcPairingCodeInput,
    nwcWallet,
    nwcInfo,
    nwcStatus,
    nwcBalance,
    nwcBusy,
    nwcPayInvoice,
    setNwcPayInvoice,
    nwcMakeAmount,
    setNwcMakeAmount,
    nwcMakeDesc,
    setNwcMakeDesc,
    nwcCreatedInvoice,
    nwcConnectionSummary,
    connectNwc,
    disconnectNwc,
    handleNwcPay,
    handleNwcMakeInvoice,
    copyToClipboard,
  };
}
