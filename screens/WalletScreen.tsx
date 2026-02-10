/**
 * WalletScreen
 *
 * Configure payments:
 * - Lightning via Nostr Wallet Connect (NIP-47 / NWC)
 * - Cashu eCash wallet (NIP-60)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, Icon, Input, Text } from '@rneui/themed';
import * as Clipboard from 'expo-clipboard';
import {
  NDKCashuWallet,
  NDKKind,
  NDKNWCWallet,
  type NDKNWCGetInfoResult,
  type NDKWalletBalance,
  NDKWalletStatus,
  useNDKCurrentUser,
} from '@nostr-dev-kit/mobile';

import { ScreenContainer, showToast } from '@components/ui';
import { useAppTheme } from '@hooks';
import { ndk } from '@lib/ndk';
import { clearNwcPairingCode, loadNwcPairingCode, saveNwcPairingCode } from '@lib/payments/nwcStorage';
import { tryParseNwcUri } from '@lib/payments/nwcUri';

function splitUrls(input: string): string[] {
  return input
    .split(/[\s,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function shortHex(hex: string, head = 12, tail = 8): string {
  if (!hex) return '';
  if (hex.length <= head + tail + 3) return hex;
  return `${hex.slice(0, head)}...${hex.slice(-tail)}`;
}

function walletStatusLabel(status: NDKWalletStatus | undefined): string {
  switch (status) {
    case NDKWalletStatus.READY:
      return 'ready';
    case NDKWalletStatus.LOADING:
      return 'loading';
    case NDKWalletStatus.ERROR:
      return 'error';
    case NDKWalletStatus.INITIAL:
      return 'initial';
    default:
      return 'unknown';
  }
}

function balanceAmount(balance: NDKWalletBalance | undefined): number {
  return balance?.amount ?? 0;
}

export default function WalletScreen() {
  const { colors } = useAppTheme();
  const currentUser = useNDKCurrentUser();

  // =============================================================================
  // Lightning (NWC)
  // =============================================================================
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
    return {
      pubkey: parsed.pubkey,
      relays: parsed.relays,
    };
  }, [nwcWallet?.pairingCode]);

  const disconnectNwc = useCallback(async () => {
    setNwcBusy(true);
    try {
      await clearNwcPairingCode();

      // Best-effort: close NWC pool relays to avoid leaving sockets around.
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
        // Reset existing wallet (if any) before creating a new one.
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

        // Try to load basic info early for nicer UX.
        wallet
          .getInfo(true)
          .then((info) => setNwcInfo(info))
          .catch((err) => console.warn('[Wallet] NWC getInfo failed:', err));

        wallet
          .updateBalance()
          .then(() => setNwcBalance(balanceAmount(wallet.balance)))
          .catch((err) => console.warn('[Wallet] NWC updateBalance failed:', err));

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
        if (isCancelled) return;
        if (stored) {
          setNwcPairingCodeInput(stored);
          connectNwc(stored, { persist: false });
        }
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
      const res = await nwcWallet.makeInvoice(amount, nwcMakeDesc.trim() || 'Eventinel');
      setNwcCreatedInvoice(res.invoice);
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

  // =============================================================================
  // Cashu (NIP-60)
  // =============================================================================
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
    if (!currentUser?.pubkey) return;

    setCashuBusy(true);
    try {
      const event = await ndk.fetchEvent({
        kinds: [NDKKind.CashuWallet],
        authors: [currentUser.pubkey],
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
  }, [currentUser?.pubkey]);

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
      deposit.on('error', (msg) => {
        showToast.error('Deposit failed', msg);
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

  // =============================================================================
  // Render
  // =============================================================================
  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text h2 style={[styles.title, { color: colors.text }]}>Wallet</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Lightning via NWC and Cashu (NIP-60)
        </Text>
      </View>

      {/* Lightning / NWC */}
      <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Icon name="bolt" type="material" size={20} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Lightning (NWC)</Text>
          <View style={{ flex: 1 }} />
          {nwcWallet ? (
            <View style={[styles.badge, { borderColor: colors.borderMuted }]}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {walletStatusLabel(nwcStatus)}
              </Text>
            </View>
          ) : (
            <View style={[styles.badge, { borderColor: colors.borderMuted }]}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>disconnected</Text>
            </View>
          )}
        </View>

        {nwcWallet ? (
          <>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              Balance: <Text style={{ color: colors.text }}>{nwcBalance}</Text> sats
            </Text>

            {nwcConnectionSummary ? (
              <View style={styles.kvRow}>
                <Text style={[styles.kvLabel, { color: colors.textMuted }]}>Service</Text>
                <Text style={[styles.kvValue, { color: colors.text }]} selectable>
                  {shortHex(nwcConnectionSummary.pubkey)}
                </Text>
              </View>
            ) : null}

            {nwcInfo ? (
              <View style={styles.kvRow}>
                <Text style={[styles.kvLabel, { color: colors.textMuted }]}>Alias</Text>
                <Text style={[styles.kvValue, { color: colors.text }]}>{nwcInfo.alias}</Text>
              </View>
            ) : null}

            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pay Invoice</Text>
            <Input
              placeholder="lnbc..."
              value={nwcPayInvoice}
              onChangeText={setNwcPayInvoice}
              autoCapitalize="none"
              autoCorrect={false}
              inputStyle={{ color: colors.text }}
              placeholderTextColor={colors.textMuted}
              containerStyle={styles.inputContainer}
              inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <Button
              title="Pay"
              onPress={handleNwcPay}
              disabled={nwcBusy}
              containerStyle={styles.buttonContainer}
            />

            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Create Invoice</Text>
            <Input
              placeholder="Amount (sats)"
              keyboardType="numeric"
              value={nwcMakeAmount}
              onChangeText={setNwcMakeAmount}
              inputStyle={{ color: colors.text }}
              placeholderTextColor={colors.textMuted}
              containerStyle={styles.inputContainer}
              inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <Input
              placeholder="Description"
              value={nwcMakeDesc}
              onChangeText={setNwcMakeDesc}
              inputStyle={{ color: colors.text }}
              placeholderTextColor={colors.textMuted}
              containerStyle={styles.inputContainer}
              inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <Button
              title="Create Invoice"
              type="outline"
              onPress={handleNwcMakeInvoice}
              disabled={nwcBusy}
              containerStyle={styles.buttonContainer}
            />

            {nwcCreatedInvoice ? (
              <View style={styles.invoiceBox}>
                <Text style={[styles.invoiceLabel, { color: colors.textMuted }]}>Invoice</Text>
                <Text style={[styles.invoiceValue, { color: colors.text }]} selectable>
                  {nwcCreatedInvoice}
                </Text>
                <View style={styles.invoiceActions}>
                  <Pressable
                    onPress={() => copyToClipboard(nwcCreatedInvoice, 'Invoice')}
                    style={({ pressed }) => [styles.smallAction, pressed && { opacity: 0.7 }]}
                  >
                    <Icon name="content-copy" type="material" size={18} color={colors.primary} />
                    <Text style={[styles.smallActionText, { color: colors.primary }]}>Copy</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.rowActions}>
              <Button title="Disconnect" type="clear" onPress={disconnectNwc} disabled={nwcBusy} />
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              Paste a NWC pairing code from your Lightning wallet.
            </Text>
            <Input
              placeholder="nostr+walletconnect://..."
              value={nwcPairingCodeInput}
              onChangeText={setNwcPairingCodeInput}
              autoCapitalize="none"
              autoCorrect={false}
              inputStyle={{ color: colors.text }}
              placeholderTextColor={colors.textMuted}
              containerStyle={styles.inputContainer}
              inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <Button
              title="Connect"
              onPress={() => connectNwc(nwcPairingCodeInput, { persist: true })}
              disabled={nwcBusy}
              containerStyle={styles.buttonContainer}
            />
          </>
        )}
      </Card>

      {/* Cashu / NIP-60 */}
      <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Icon name="account-balance-wallet" type="material" size={20} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Cashu (NIP-60)</Text>
          <View style={{ flex: 1 }} />
          {cashuWallet ? (
            <View style={[styles.badge, { borderColor: colors.borderMuted }]}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {walletStatusLabel(cashuStatus)}
              </Text>
            </View>
          ) : (
            <View style={[styles.badge, { borderColor: colors.borderMuted }]}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>not set up</Text>
            </View>
          )}
        </View>

        {!currentUser?.pubkey ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Sign in to manage your Cashu wallet.
          </Text>
        ) : cashuWallet ? (
          <>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              Balance: <Text style={{ color: colors.text }}>{cashuBalance}</Text> sats
            </Text>

            {cashuWallet.mints?.length ? (
              <View style={styles.kvRow}>
                <Text style={[styles.kvLabel, { color: colors.textMuted }]}>Mints</Text>
                <Text style={[styles.kvValue, { color: colors.text }]} numberOfLines={2}>
                  {cashuWallet.mints.join(', ')}
                </Text>
              </View>
            ) : null}

            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Deposit (Mint)</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              Generate a Lightning invoice to mint ecash into your Cashu wallet.
            </Text>
            <Input
              placeholder="Amount (sats)"
              keyboardType="numeric"
              value={cashuDepositAmount}
              onChangeText={setCashuDepositAmount}
              inputStyle={{ color: colors.text }}
              placeholderTextColor={colors.textMuted}
              containerStyle={styles.inputContainer}
              inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <Button
              title="Create Deposit Invoice"
              onPress={handleCashuDeposit}
              disabled={cashuBusy}
              containerStyle={styles.buttonContainer}
            />

            {cashuDepositInvoice ? (
              <View style={styles.invoiceBox}>
                <Text style={[styles.invoiceLabel, { color: colors.textMuted }]}>Invoice</Text>
                <Text style={[styles.invoiceValue, { color: colors.text }]} selectable>
                  {cashuDepositInvoice}
                </Text>
                <View style={styles.invoiceActions}>
                  <Pressable
                    onPress={() => copyToClipboard(cashuDepositInvoice, 'Invoice')}
                    style={({ pressed }) => [styles.smallAction, pressed && { opacity: 0.7 }]}
                  >
                    <Icon name="content-copy" type="material" size={18} color={colors.primary} />
                    <Text style={[styles.smallActionText, { color: colors.primary }]}>Copy</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Receive Token</Text>
            <Input
              placeholder="cashu..."
              value={cashuReceiveToken}
              onChangeText={setCashuReceiveToken}
              autoCapitalize="none"
              autoCorrect={false}
              inputStyle={{ color: colors.text }}
              placeholderTextColor={colors.textMuted}
              containerStyle={styles.inputContainer}
              inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <Button
              title="Receive"
              type="outline"
              onPress={handleCashuReceiveToken}
              disabled={cashuBusy}
              containerStyle={styles.buttonContainer}
            />

            <View style={styles.rowActions}>
              <Button title="Refresh" type="clear" onPress={refreshCashuWallet} disabled={cashuBusy} />
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              Create a NIP-60 wallet (published as kind 17375, with an encrypted backup).
            </Text>
            <Input
              placeholder="Mint URLs (space/comma/newline separated)"
              value={cashuCreateMints}
              onChangeText={setCashuCreateMints}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              inputStyle={{ color: colors.text }}
              placeholderTextColor={colors.textMuted}
              containerStyle={styles.inputContainer}
              inputContainerStyle={[
                styles.input,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
            <Input
              placeholder="Wallet relay URLs (optional)"
              value={cashuCreateRelays}
              onChangeText={setCashuCreateRelays}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              inputStyle={{ color: colors.text }}
              placeholderTextColor={colors.textMuted}
              containerStyle={styles.inputContainer}
              inputContainerStyle={[
                styles.input,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
            <Button
              title="Create Cashu Wallet"
              onPress={handleCreateCashuWallet}
              disabled={cashuBusy}
              containerStyle={styles.buttonContainer}
            />
          </>
        )}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 12,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  meta: {
    fontSize: 13,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputContainer: {
    paddingHorizontal: 0,
  },
  input: {
    borderBottomWidth: 0,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  buttonContainer: {
    marginTop: 6,
  },
  rowActions: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  invoiceBox: {
    marginTop: 10,
    borderRadius: 10,
  },
  invoiceLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  invoiceValue: {
    fontSize: 12,
    lineHeight: 16,
  },
  invoiceActions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  smallActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  kvLabel: {
    width: 70,
    fontSize: 12,
  },
  kvValue: {
    flex: 1,
    fontSize: 12,
  },
});

