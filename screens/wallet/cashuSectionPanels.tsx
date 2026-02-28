import { Pressable, View } from 'react-native';
import { Button, Divider, Icon, Input, Text } from '@rneui/themed';

import { walletScreenStyles as styles } from './styles';

export type ThemeColors = {
  background: string;
  border: string;
  borderMuted: string;
  primary: string;
  surface: string;
  text: string;
  textMuted: string;
};

type SectionInputProps = {
  colors: ThemeColors;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
  multiline?: boolean;
  keyboardType?: 'numeric' | 'default';
  autoCapitalize?: 'none' | 'sentences';
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
};

type CashuWalletConnectedPanelProps = {
  colors: ThemeColors;
  balance: number;
  mints?: string[];
  relays?: string[];
  depositAmount: string;
  setDepositAmount: (value: string) => void;
  onCreateDeposit: () => void;
  depositInvoice: string | null;
  onCopyInvoice: (value: string) => void;
  editMints: string;
  setEditMints: (value: string) => void;
  editRelays: string;
  setEditRelays: (value: string) => void;
  onSaveMints: () => void;
  sendAmount: string;
  setSendAmount: (value: string) => void;
  onSendToken: () => void;
  sendToken: string | null;
  onCopySendToken: (value: string) => void;
  receiveToken: string;
  setReceiveToken: (value: string) => void;
  onReceiveToken: () => void;
  onRefresh: () => void;
  busy: boolean;
};

type CashuWalletCreatePanelProps = {
  colors: ThemeColors;
  createMints: string;
  setCreateMints: (value: string) => void;
  createRelays: string;
  setCreateRelays: (value: string) => void;
  onCreateWallet: () => void;
  busy: boolean;
};

function inputStyles(colors: ThemeColors) {
  return {
    containerStyle: styles.inputContainer,
    inputContainerStyle: [styles.input, { borderColor: colors.border, backgroundColor: colors.background }],
    inputStyle: { color: colors.text },
    placeholderTextColor: colors.textMuted,
  };
}

function WalletUrlsList({
  colors,
  label,
  urls,
}: {
  colors: ThemeColors;
  label: string;
  urls?: string[];
}) {
  if (!urls?.length) return null;
  return (
    <View style={styles.kvRow}>
      <Text style={[styles.kvLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.kvValue, { color: colors.text }]} numberOfLines={2}>
        {urls.join(', ')}
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

function SendTokenPanel({
  colors,
  token,
  onCopy,
}: {
  colors: ThemeColors;
  token: string | null;
  onCopy: (value: string) => void;
}) {
  if (!token) return null;

  return (
    <View style={styles.invoiceBox}>
      <Text style={[styles.invoiceLabel, { color: colors.textMuted }]}>Token</Text>
      <Text style={[styles.invoiceValue, { color: colors.text }]} selectable>
        {token}
      </Text>
      <View style={styles.invoiceActions}>
        <Pressable
          onPress={() => onCopy(token)}
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
  editable = true,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  secureTextEntry,
}: SectionInputProps & { secureTextEntry?: boolean }) {
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
      editable={editable}
      multiline={multiline}
      {...sharedStyles}
    />
  );
}

export function CashuWalletConnectedPanel({
  colors,
  balance,
  mints,
  relays,
  depositAmount,
  setDepositAmount,
  onCreateDeposit,
  depositInvoice,
  onCopyInvoice,
  editMints,
  setEditMints,
  editRelays,
  setEditRelays,
  onSaveMints,
  sendAmount,
  setSendAmount,
  onSendToken,
  sendToken,
  onCopySendToken,
  receiveToken,
  setReceiveToken,
  onReceiveToken,
  onRefresh,
  busy,
}: CashuWalletConnectedPanelProps) {
  return (
    <>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        Balance: <Text style={{ color: colors.text }}>{balance}</Text> sats
      </Text>
      <WalletUrlsList colors={colors} label="Mints" urls={mints} />
      <WalletUrlsList colors={colors} label="Relays" urls={relays} />
      <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit Wallet Settings</Text>
      <SectionInput
        colors={colors}
        placeholder="Mint URLs (space/comma/newline separated)"
        value={editMints}
        onChangeText={setEditMints}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
      />
      <SectionInput
        colors={colors}
        placeholder="Relay URLs (space/comma/newline separated)"
        value={editRelays}
        onChangeText={setEditRelays}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
      />
      <Button
        title="Save Wallet Settings"
        type="outline"
        onPress={onSaveMints}
        disabled={busy}
        containerStyle={styles.buttonContainer}
      />
      <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Deposit (Mint)</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        Generate a Lightning invoice to mint ecash into your Cashu wallet.
      </Text>
      <SectionInput
        colors={colors}
        placeholder="Amount (sats)"
        keyboardType="numeric"
        value={depositAmount}
        onChangeText={setDepositAmount}
      />
      <Button
        title="Create Deposit Invoice"
        onPress={onCreateDeposit}
        disabled={busy}
        containerStyle={styles.buttonContainer}
      />
      <DepositInvoicePanel colors={colors} invoice={depositInvoice} onCopy={onCopyInvoice} />
      <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Send Token</Text>
      <SectionInput
        colors={colors}
        placeholder="Amount (sats)"
        keyboardType="numeric"
        value={sendAmount}
        onChangeText={setSendAmount}
      />
      <Button
        title="Create Token"
        type="outline"
        onPress={onSendToken}
        disabled={busy}
        containerStyle={styles.buttonContainer}
      />
      <SendTokenPanel colors={colors} token={sendToken} onCopy={onCopySendToken} />
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
  );
}

export function CashuWalletCreatePanel({
  colors,
  createMints,
  setCreateMints,
  createRelays,
  setCreateRelays,
  onCreateWallet,
  busy,
}: CashuWalletCreatePanelProps) {
  return (
    <>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        Create a NIP-60 wallet (published as kind 17375, with an encrypted backup).
      </Text>
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
        placeholder="Wallet relay URL"
        value={createRelays}
        onChangeText={setCreateRelays}
        autoCapitalize="none"
        autoCorrect={false}
        editable={false}
      />
      <Button
        title="Create Cashu Wallet"
        onPress={onCreateWallet}
        disabled={busy}
        containerStyle={styles.buttonContainer}
      />
    </>
  );
}
