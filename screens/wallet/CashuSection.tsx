import { Pressable, View } from 'react-native';
import { Button, Card, Divider, Icon, Input, Text } from '@rneui/themed';
import type { NDKWalletStatus } from '@nostr-dev-kit/mobile';

import { shortHex, walletStatusLabel } from './helpers';
import { walletScreenStyles as styles } from './styles';

type ThemeColors = {
  background: string;
  border: string;
  borderMuted: string;
  primary: string;
  surface: string;
  text: string;
  textMuted: string;
};

type CashuSectionProps = {
  colors: ThemeColors;
  currentPubkey?: string;
  status: NDKWalletStatus | undefined;
  hasWallet: boolean;
  balance: number;
  busy: boolean;
  mints?: string[];
  createMints: string;
  setCreateMints: (value: string) => void;
  createRelays: string;
  setCreateRelays: (value: string) => void;
  depositAmount: string;
  setDepositAmount: (value: string) => void;
  depositInvoice: string | null;
  receiveToken: string;
  setReceiveToken: (value: string) => void;
  onCreateWallet: () => void;
  onCreateDeposit: () => void;
  onReceiveToken: () => void;
  onRefresh: () => void;
  onCopyInvoice: (value: string) => void;
};

export function CashuSection({
  colors,
  currentPubkey,
  status,
  hasWallet,
  balance,
  busy,
  mints,
  createMints,
  setCreateMints,
  createRelays,
  setCreateRelays,
  depositAmount,
  setDepositAmount,
  depositInvoice,
  receiveToken,
  setReceiveToken,
  onCreateWallet,
  onCreateDeposit,
  onReceiveToken,
  onRefresh,
  onCopyInvoice,
}: CashuSectionProps) {
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="account-balance-wallet" type="material" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Cashu (NIP-60)</Text>
        <View style={{ flex: 1 }} />
        <View style={[styles.badge, { borderColor: colors.borderMuted }]}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {hasWallet ? walletStatusLabel(status) : 'not set up'}
          </Text>
        </View>
      </View>

      {!currentPubkey ? (
        <Text style={[styles.meta, { color: colors.textMuted }]}>Sign in to manage your Cashu wallet.</Text>
      ) : hasWallet ? (
        <>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Balance: <Text style={{ color: colors.text }}>{balance}</Text> sats
          </Text>

          {mints?.length ? (
            <View style={styles.kvRow}>
              <Text style={[styles.kvLabel, { color: colors.textMuted }]}>Mints</Text>
              <Text style={[styles.kvValue, { color: colors.text }]} numberOfLines={2}>
                {mints.join(', ')}
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
            value={depositAmount}
            onChangeText={setDepositAmount}
            inputStyle={{ color: colors.text }}
            placeholderTextColor={colors.textMuted}
            containerStyle={styles.inputContainer}
            inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
          />
          <Button
            title="Create Deposit Invoice"
            onPress={onCreateDeposit}
            disabled={busy}
            containerStyle={styles.buttonContainer}
          />

          {depositInvoice ? (
            <View style={styles.invoiceBox}>
              <Text style={[styles.invoiceLabel, { color: colors.textMuted }]}>Invoice</Text>
              <Text style={[styles.invoiceValue, { color: colors.text }]} selectable>
                {depositInvoice}
              </Text>
              <View style={styles.invoiceActions}>
                <Pressable
                  onPress={() => onCopyInvoice(depositInvoice)}
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
            value={receiveToken}
            onChangeText={setReceiveToken}
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
            onPress={onReceiveToken}
            disabled={busy}
            containerStyle={styles.buttonContainer}
          />

          <View style={styles.rowActions}>
            <Button title="Refresh" type="clear" onPress={onRefresh} disabled={busy} />
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Create a NIP-60 wallet (published as kind 17375, with an encrypted backup).
          </Text>
          <Input
            placeholder="Mint URLs (space/comma/newline separated)"
            value={createMints}
            onChangeText={setCreateMints}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            inputStyle={{ color: colors.text }}
            placeholderTextColor={colors.textMuted}
            containerStyle={styles.inputContainer}
            inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
          />
          <Input
            placeholder="Wallet relay URLs (optional)"
            value={createRelays}
            onChangeText={setCreateRelays}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            inputStyle={{ color: colors.text }}
            placeholderTextColor={colors.textMuted}
            containerStyle={styles.inputContainer}
            inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
          />
          <Button
            title="Create Cashu Wallet"
            onPress={onCreateWallet}
            disabled={busy}
            containerStyle={styles.buttonContainer}
          />
        </>
      )}
    </Card>
  );
}
