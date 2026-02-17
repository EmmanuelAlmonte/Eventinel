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
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="bolt" type="material" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Lightning (NWC)</Text>
        <View style={{ flex: 1 }} />
        <View style={[styles.badge, { borderColor: colors.borderMuted }]}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {wallet ? walletStatusLabel(status) : 'disconnected'}
          </Text>
        </View>
      </View>

      {wallet ? (
        <>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Balance: <Text style={{ color: colors.text }}>{balance}</Text> sats
          </Text>

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

          <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pay Invoice</Text>
          <Input
            placeholder="lnbc..."
            value={payInvoice}
            onChangeText={setPayInvoice}
            autoCapitalize="none"
            autoCorrect={false}
            inputStyle={{ color: colors.text }}
            placeholderTextColor={colors.textMuted}
            containerStyle={styles.inputContainer}
            inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
          />
          <Button title="Pay" onPress={onPayInvoice} disabled={busy} containerStyle={styles.buttonContainer} />

          <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Create Invoice</Text>
          <Input
            placeholder="Amount (sats)"
            keyboardType="numeric"
            value={makeAmount}
            onChangeText={setMakeAmount}
            inputStyle={{ color: colors.text }}
            placeholderTextColor={colors.textMuted}
            containerStyle={styles.inputContainer}
            inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
          />
          <Input
            placeholder="Description"
            value={makeDescription}
            onChangeText={setMakeDescription}
            inputStyle={{ color: colors.text }}
            placeholderTextColor={colors.textMuted}
            containerStyle={styles.inputContainer}
            inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
          />
          <Button
            title="Create Invoice"
            type="outline"
            onPress={onCreateInvoice}
            disabled={busy}
            containerStyle={styles.buttonContainer}
          />

          {createdInvoice ? (
            <View style={styles.invoiceBox}>
              <Text style={[styles.invoiceLabel, { color: colors.textMuted }]}>Invoice</Text>
              <Text style={[styles.invoiceValue, { color: colors.text }]} selectable>
                {createdInvoice}
              </Text>
              <View style={styles.invoiceActions}>
                <Pressable
                  onPress={() => onCopyInvoice(createdInvoice)}
                  style={({ pressed }) => [styles.smallAction, pressed && { opacity: 0.7 }]}
                >
                  <Icon name="content-copy" type="material" size={18} color={colors.primary} />
                  <Text style={[styles.smallActionText, { color: colors.primary }]}>Copy</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.rowActions}>
            <Button title="Disconnect" type="clear" onPress={onDisconnect} disabled={busy} />
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Paste a NWC pairing code from your Lightning wallet.
          </Text>
          <Input
            placeholder="nostr+walletconnect://..."
            value={pairingCodeInput}
            onChangeText={setPairingCodeInput}
            autoCapitalize="none"
            autoCorrect={false}
            inputStyle={{ color: colors.text }}
            placeholderTextColor={colors.textMuted}
            containerStyle={styles.inputContainer}
            inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
          />
          <Button title="Connect" onPress={onConnect} disabled={busy} containerStyle={styles.buttonContainer} />
        </>
      )}
    </Card>
  );
}
