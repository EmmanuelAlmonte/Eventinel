import { Pressable, View } from 'react-native';
import { Button, Card, Divider, Icon, Input, Text } from '@rneui/themed';
import type { NDKWalletStatus } from '@nostr-dev-kit/mobile';

import { walletStatusLabel } from './helpers';
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

type SectionInputProps = {
  colors: ThemeColors;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'numeric' | 'default';
  autoCapitalize?: 'none' | 'sentences';
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
};

function inputStyles(colors: ThemeColors) {
  return {
    containerStyle: styles.inputContainer,
    inputContainerStyle: [styles.input, { borderColor: colors.border, backgroundColor: colors.background }],
    inputStyle: { color: colors.text },
    placeholderTextColor: colors.textMuted,
  };
}

function CashuSectionHeader({ colors, statusText }: { colors: ThemeColors; statusText: string }) {
  return (
    <View style={styles.cardHeader}>
      <Icon name="account-balance-wallet" type="material" size={20} color={colors.primary} />
      <Text style={[styles.cardTitle, { color: colors.text }]}>Cashu (NIP-60)</Text>
      <View style={{ flex: 1 }} />
      <View style={[styles.badge, { borderColor: colors.borderMuted }]}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{statusText}</Text>
      </View>
    </View>
  );
}

function MintsList({ colors, mints }: { colors: ThemeColors; mints?: string[] }) {
  if (!mints?.length) return null;
  return (
    <View style={styles.kvRow}>
      <Text style={[styles.kvLabel, { color: colors.textMuted }]}>Mints</Text>
      <Text style={[styles.kvValue, { color: colors.text }]} numberOfLines={2}>
        {mints.join(', ')}
      </Text>
    </View>
  );
}

function DepositInvoicePanel({
  colors,
  invoice,
  onCopy,
}: {
  colors: ThemeColors;
  invoice: string | null;
  onCopy: (value: string) => void;
}) {
  if (!invoice) return null;

  return (
    <View style={styles.invoiceBox}>
      <Text style={[styles.invoiceLabel, { color: colors.textMuted }]}>Invoice</Text>
      <Text style={[styles.invoiceValue, { color: colors.text }]} selectable>
        {invoice}
      </Text>
      <View style={styles.invoiceActions}>
        <Pressable
          onPress={() => onCopy(invoice)}
          style={({ pressed }) => [styles.smallAction, pressed && { opacity: 0.7 }]}
        >
          <Icon name="content-copy" type="material" size={18} color={colors.primary} />
          <Text style={[styles.smallActionText, { color: colors.primary }]}>Copy</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SectionInput({
  colors,
  placeholder,
  value,
  onChangeText,
  multiline,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  secureTextEntry,
}: SectionInputProps & { secureTextEntry?: boolean; }) {
  const sharedStyles = inputStyles(colors);
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      secureTextEntry={secureTextEntry}
      multiline={multiline}
      {...sharedStyles}
    />
  );
}

function CashuWalletConnectedPanel({
  colors,
  balance,
  mints,
  depositAmount,
  setDepositAmount,
  onCreateDeposit,
  depositInvoice,
  onCopyInvoice,
  receiveToken,
  setReceiveToken,
  onReceiveToken,
  onRefresh,
  busy,
}: {
  colors: ThemeColors;
  balance: number;
  mints?: string[];
  depositAmount: string;
  setDepositAmount: (value: string) => void;
  onCreateDeposit: () => void;
  depositInvoice: string | null;
  onCopyInvoice: (value: string) => void;
  receiveToken: string;
  setReceiveToken: (value: string) => void;
  onReceiveToken: () => void;
  onRefresh: () => void;
  busy: boolean;
}) {
  return (
    <>
      <Text style={[styles.meta, { color: colors.textMuted }]}>Balance: <Text style={{ color: colors.text }}>{balance}</Text> sats</Text>
      <MintsList colors={colors} mints={mints} />
      <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Deposit (Mint)</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>Generate a Lightning invoice to mint ecash into your Cashu wallet.</Text>
      <SectionInput
        colors={colors}
        placeholder="Amount (sats)"
        keyboardType="numeric"
        value={depositAmount}
        onChangeText={setDepositAmount}
      />
      <Button title="Create Deposit Invoice" onPress={onCreateDeposit} disabled={busy} containerStyle={styles.buttonContainer} />
      <DepositInvoicePanel colors={colors} invoice={depositInvoice} onCopy={onCopyInvoice} />
      <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Receive Token</Text>
      <SectionInput
        colors={colors}
        placeholder="cashu..."
        value={receiveToken}
        onChangeText={setReceiveToken}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button title="Receive" type="outline" onPress={onReceiveToken} disabled={busy} containerStyle={styles.buttonContainer} />
      <View style={styles.rowActions}>
        <Button title="Refresh" type="clear" onPress={onRefresh} disabled={busy} />
      </View>
    </>
  );
}

function CashuWalletCreatePanel({
  colors,
  createMints,
  setCreateMints,
  createRelays,
  setCreateRelays,
  onCreateWallet,
  busy,
}: {
  colors: ThemeColors;
  createMints: string;
  setCreateMints: (value: string) => void;
  createRelays: string;
  setCreateRelays: (value: string) => void;
  onCreateWallet: () => void;
  busy: boolean;
}) {
  return (
    <>
      <Text style={[styles.meta, { color: colors.textMuted }]}>Create a NIP-60 wallet (published as kind 17375, with an encrypted backup).</Text>
      <SectionInput
        colors={colors}
        placeholder="Mint URLs (space/comma/newline separated)"
        value={createMints}
        onChangeText={setCreateMints}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
      />
      <SectionInput
        colors={colors}
        placeholder="Wallet relay URLs (optional)"
        value={createRelays}
        onChangeText={setCreateRelays}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
      />
      <Button title="Create Cashu Wallet" onPress={onCreateWallet} disabled={busy} containerStyle={styles.buttonContainer} />
    </>
  );
}

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
  const statusText = hasWallet ? walletStatusLabel(status) : 'not set up';

  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }] }>
      <CashuSectionHeader colors={colors} statusText={statusText} />

      {!currentPubkey ? (
        <Text style={[styles.meta, { color: colors.textMuted }]}>Sign in to manage your Cashu wallet.</Text>
      ) : hasWallet ? (
        <CashuWalletConnectedPanel
          colors={colors}
          balance={balance}
          mints={mints}
          depositAmount={depositAmount}
          setDepositAmount={setDepositAmount}
          onCreateDeposit={onCreateDeposit}
          depositInvoice={depositInvoice}
          onCopyInvoice={onCopyInvoice}
          receiveToken={receiveToken}
          setReceiveToken={setReceiveToken}
          onReceiveToken={onReceiveToken}
          onRefresh={onRefresh}
          busy={busy}
        />
      ) : (
        <CashuWalletCreatePanel
          colors={colors}
          createMints={createMints}
          setCreateMints={setCreateMints}
          createRelays={createRelays}
          setCreateRelays={setCreateRelays}
          onCreateWallet={onCreateWallet}
          busy={busy}
        />
      )}
    </Card>
  );
}
