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

type AsyncError = (error: unknown) => void;

function formatError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function clearNwcWalletState(
  setNwcWallet: (wallet: NDKNWCWallet | null) => void,
  setNwcInfo: (info: NDKNWCGetInfoResult | null) => void,
  setNwcStatus: (status: NDKWalletStatus | undefined) => void,
  setNwcBalance: (balance: number) => void,
  setNwcCreatedInvoice: (invoice: string | null) => void
) {
  setNwcWallet(null);
  setNwcInfo(null);
  setNwcStatus(undefined);
  setNwcBalance(0);
  setNwcCreatedInvoice(null);
}

function syncNwcWalletSnapshot(
  wallet: NDKNWCWallet,
  setNwcWallet: (wallet: NDKNWCWallet | null) => void,
  setNwcStatus: (status: NDKWalletStatus | undefined) => void,
  setNwcBalance: (balance: number) => void
) {
  setNwcWallet(wallet);
  setNwcStatus(wallet.status);
  setNwcBalance(balanceAmount(wallet.balance));
}

function bindNwcWalletEvents(
  wallet: NDKNWCWallet,
  setNwcStatus: (status: NDKWalletStatus | undefined) => void,
  setNwcBalance: (balance: number) => void
) {
  const handleReady = () => {
    setNwcStatus(wallet.status);
    setNwcBalance(balanceAmount(wallet.balance));
  };
  const handleBalanceUpdated = (balance?: NDKWalletBalance) => {
    setNwcBalance(balanceAmount(balance));
  };
  const handleStatusChanged = (status: NDKWalletStatus) => {
    setNwcStatus(status);
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

async function runWithNwcBusy(
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

function parsePositiveAmount(amountText: string): number | null {
  const amount = Number.parseInt(amountText.trim(), 10);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

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
    await runWithNwcBusy(
      setNwcBusy,
      async () => {
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

        clearNwcWalletState(
          setNwcWallet,
          setNwcInfo,
          setNwcStatus,
          setNwcBalance,
          setNwcCreatedInvoice
        );
        showToast.success('Lightning wallet disconnected');
      },
      (error) => {
        console.warn('[Wallet] Failed to disconnect NWC:', error);
        showToast.error('Failed to disconnect', error instanceof Error ? error.message : 'Unknown error');
      }
    );
  }, [nwcWallet]);

  const connectNwc = useCallback(
    async (pairingCode: string, opts?: { persist?: boolean }) => {
      const persist = opts?.persist ?? true;
      const parsed = tryParseNwcUri(pairingCode);
      if (!parsed) {
        showToast.error('Invalid NWC pairing code', 'Paste a full nostr+walletconnect:// URI');
        return;
      }

      await runWithNwcBusy(
        setNwcBusy,
        async () => {
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

          syncNwcWalletSnapshot(wallet, setNwcWallet, setNwcStatus, setNwcBalance);

          wallet.getInfo(true).then(setNwcInfo).catch((error) => {
            console.warn('[Wallet] NWC getInfo failed:', error);
          });

          wallet
            .updateBalance()
            .then(() => setNwcBalance(balanceAmount(wallet.balance)))
            .catch((error) => console.warn('[Wallet] NWC updateBalance failed:', error));

          showToast.success('Lightning wallet connected');
        },
        (error) => {
          console.warn('[Wallet] Failed to connect NWC:', error);
          showToast.error('Failed to connect NWC', formatError(error, 'Unknown error'));
          void clearNwcPairingCode();
        }
      );
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

    return bindNwcWalletEvents(nwcWallet, setNwcStatus, setNwcBalance);
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

    await runWithNwcBusy(
      setNwcBusy,
      async () => {
        await nwcWallet.lnPay({ pr: invoice });
        await nwcWallet.updateBalance();
        setNwcBalance(balanceAmount(nwcWallet.balance));
        setNwcPayInvoice('');
        showToast.success('Invoice paid');
      },
      (error) => {
        console.warn('[Wallet] NWC pay failed:', error);
        showToast.error('Payment failed', formatError(error, 'Unknown error'));
      }
    );
  }, [nwcPayInvoice, nwcWallet]);

  const handleNwcMakeInvoice = useCallback(async () => {
    if (!nwcWallet) {
      showToast.error('Connect a Lightning wallet first');
      return;
    }
    const amount = parsePositiveAmount(nwcMakeAmount);
    if (amount == null) {
      showToast.error('Enter a valid amount (sats)');
      return;
    }

    await runWithNwcBusy(
      setNwcBusy,
      async () => {
        const result = await nwcWallet.makeInvoice(amount, nwcMakeDesc.trim() || 'Eventinel');
        setNwcCreatedInvoice(result.invoice);
        showToast.success('Invoice created');
      },
      (error) => {
        console.warn('[Wallet] NWC makeInvoice failed:', error);
        showToast.error('Failed to create invoice', formatError(error, 'Unknown error'));
      }
    );
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
