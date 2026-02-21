import { Pressable, View } from 'react-native';
import { Button, Card, Divider, Icon, Input, Text } from '@rneui/themed';
import type { NDKNWCGetInfoResult, NDKNWCWallet, NDKWalletStatus } from '@nostr-dev-kit/mobile';

import { shortHex, walletStatusLabel } from './helpers';
import { walletScreenStyles as styles } from './styles';

type ThemeColors = {
  background: string;
  border: string;
  primary: string;
  surface: string;
  text: string;
  textMuted: string;
  borderMuted: string;
};

type NwcSectionProps = {
  colors: ThemeColors;
  wallet: NDKNWCWallet | null;
  info: NDKNWCGetInfoResult | null;
  status: NDKWalletStatus | undefined;
  balance: number;
  busy: boolean;
  pairingCodeInput: string;
  setPairingCodeInput: (value: string) => void;
  payInvoice: string;
  setPayInvoice: (value: string) => void;
  makeAmount: string;
  setMakeAmount: (value: string) => void;
  makeDescription: string;
  setMakeDescription: (value: string) => void;
  createdInvoice: string | null;
  connectionSummary: { pubkey: string; relays: string[] } | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onPayInvoice: () => void;
  onCreateInvoice: () => void;
  onCopyInvoice: (value: string) => void;
};

type SectionInputProps = {
  colors: ThemeColors;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'numeric' | 'default';
  autoCapitalize?: 'none' | 'sentences';
  autoCorrect?: boolean;
  multiline?: boolean;
};

function sharedInputStyles(colors: ThemeColors) {
  return {
    containerStyle: styles.inputContainer,
    inputContainerStyle: [styles.input, { borderColor: colors.border, backgroundColor: colors.background }],
    inputStyle: { color: colors.text },
    placeholderTextColor: colors.textMuted,
  };
}

function NwcSectionHeader({ colors, statusText }: { colors: ThemeColors; statusText: string }) {
  return (
    <View style={styles.cardHeader}>
      <Icon name="bolt" type="material" size={20} color={colors.primary} />
      <Text style={[styles.cardTitle, { color: colors.text }]}>Lightning (NWC)</Text>
      <View style={{ flex: 1 }} />
      <View style={[styles.badge, { borderColor: colors.borderMuted }]}> 
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{statusText}</Text>
      </View>
    </View>
  );
}

function InvoiceCopyBox({ colors, invoice, onCopy }: { colors: ThemeColors; invoice: string | null; onCopy: (value: string) => void }) {
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
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  multiline,
}: SectionInputProps) {
  const stylesForInput = sharedInputStyles(colors);
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      multiline={multiline}
      {...stylesForInput}
    />
  );
}

function NwcWalletInfoRows({
  colors,
  connectionSummary,
  info,
}: {
  colors: ThemeColors;
  connectionSummary: { pubkey: string; relays: string[] } | null;
  info: NDKNWCGetInfoResult | null;
}) {
  if (!connectionSummary && !info) return null;

  return (
    <>
      {connectionSummary ? (
        <View style={styles.kvRow}>
          <Text style={[styles.kvLabel, { color: colors.textMuted }]}>Service</Text>
          <Text style={[styles.kvValue, { color: colors.text }]} selectable>
            {shortHex(connectionSummary.pubkey)}
          </Text>
        </View>
      ) : null}

      {info ? (
        <View style={styles.kvRow}>
          <Text style={[styles.kvLabel, { color: colors.textMuted }]}>Alias</Text>
          <Text style={[styles.kvValue, { color: colors.text }]}>{info.alias}</Text>
        </View>
      ) : null}
    </>
  );
}

function NwcConnectedPanel({
  colors,
  balance,
  connectionSummary,
  info,
  payInvoice,
  onSetInvoice,
  onPayInvoice,
  makeAmount,
  makeDescription,
  onSetAmount,
  onSetDescription,
  onCreateInvoice,
  createdInvoice,
  onCopyInvoice,
  onDisconnect,
  busy,
}: {
  colors: ThemeColors;
  balance: number;
  connectionSummary: { pubkey: string; relays: string[] } | null;
  info: NDKNWCGetInfoResult | null;
  payInvoice: string;
  onPayInvoice: () => void;
  onSetInvoice: (value: string) => void;
  makeAmount: string;
  makeDescription: string;
  onSetAmount: (value: string) => void;
  onSetDescription: (value: string) => void;
  onCreateInvoice: () => void;
  createdInvoice: string | null;
  onCopyInvoice: (value: string) => void;
  onDisconnect: () => void;
  busy: boolean;
}) {
  return (
    <>
      <Text style={[styles.meta, { color: colors.textMuted }]}>Balance: <Text style={{ color: colors.text }}>{balance}</Text> sats</Text>
      <NwcWalletInfoRows colors={colors} connectionSummary={connectionSummary} info={info} />
      <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Pay Invoice</Text>
      <SectionInput
        colors={colors}
        placeholder="lnbc..."
        value={payInvoice}
        onChangeText={onSetInvoice}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button title="Pay" onPress={onPayInvoice} disabled={busy} containerStyle={styles.buttonContainer} />
      <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Create Invoice</Text>
      <SectionInput
        colors={colors}
        placeholder="Amount (sats)"
        keyboardType="numeric"
        value={makeAmount}
        onChangeText={onSetAmount}
      />
      <SectionInput
        colors={colors}
        placeholder="Description"
        value={makeDescription}
        onChangeText={onSetDescription}
      />
      <Button
        title="Create Invoice"
        type="outline"
        onPress={onCreateInvoice}
        disabled={busy}
        containerStyle={styles.buttonContainer}
      />
      <InvoiceCopyBox colors={colors} invoice={createdInvoice} onCopy={onCopyInvoice} />
      <View style={styles.rowActions}>
        <Button title="Disconnect" type="clear" onPress={onDisconnect} disabled={busy} />
      </View>
    </>
  );
}

function NwcDisconnectedPanel({
  colors,
  pairingCodeInput,
  onPairingCodeChange,
  onConnect,
  busy,
}: {
  colors: ThemeColors;
  pairingCodeInput: string;
  onPairingCodeChange: (value: string) => void;
  onConnect: () => void;
  busy: boolean;
}) {
  return (
    <>
      <Text style={[styles.meta, { color: colors.textMuted }]}>Paste a NWC pairing code from your Lightning wallet.</Text>
      <SectionInput
        colors={colors}
        placeholder="nostr+walletconnect://..."
        value={pairingCodeInput}
        onChangeText={onPairingCodeChange}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button title="Connect" onPress={onConnect} disabled={busy} containerStyle={styles.buttonContainer} />
    </>
  );
}

export function NwcSection({
  colors,
  wallet,
  info,
  status,
  balance,
  busy,
  pairingCodeInput,
  setPairingCodeInput,
  payInvoice,
  setPayInvoice,
  makeAmount,
  setMakeAmount,
  makeDescription,
  setMakeDescription,
  createdInvoice,
  connectionSummary,
  onConnect,
  onDisconnect,
  onPayInvoice,
  onCreateInvoice,
  onCopyInvoice,
}: NwcSectionProps) {
  const statusText = wallet ? walletStatusLabel(status) : 'disconnected';

  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }] }>
      <NwcSectionHeader colors={colors} statusText={statusText} />
      {wallet ? (
        <NwcConnectedPanel
          colors={colors}
          balance={balance}
          connectionSummary={connectionSummary}
          info={info}
          payInvoice={payInvoice}
          onSetInvoice={setPayInvoice}
          onPayInvoice={onPayInvoice}
          makeAmount={makeAmount}
          makeDescription={makeDescription}
          onSetAmount={setMakeAmount}
          onSetDescription={setMakeDescription}
          onCreateInvoice={onCreateInvoice}
          createdInvoice={createdInvoice}
          onCopyInvoice={onCopyInvoice}
          onDisconnect={onDisconnect}
          busy={busy}
        />
      ) : (
        <NwcDisconnectedPanel
          colors={colors}
          pairingCodeInput={pairingCodeInput}
          onPairingCodeChange={setPairingCodeInput}
          onConnect={onConnect}
          busy={busy}
        />
      )}
    </Card>
  );
}
