import { View } from 'react-native';
import { Card, Icon, Text } from '@rneui/themed';
import type { NDKWalletStatus } from '@nostr-dev-kit/mobile';

import { walletStatusLabel } from './helpers';
import { walletScreenStyles as styles } from './styles';
import {
  CashuWalletConnectedPanel,
  CashuWalletCreatePanel,
  type ThemeColors,
} from './cashuSectionPanels';

type CashuSectionProps = {
  colors: ThemeColors;
  currentPubkey?: string;
  status: NDKWalletStatus | undefined;
  hasWallet: boolean;
  balance: number;
  busy: boolean;
  mints?: string[];
  relays?: string[];
  createMints: string;
  setCreateMints: (value: string) => void;
  createRelays: string;
  setCreateRelays: (value: string) => void;
  depositAmount: string;
  setDepositAmount: (value: string) => void;
  depositInvoice: string | null;
  editMints: string;
  setEditMints: (value: string) => void;
  editRelays: string;
  setEditRelays: (value: string) => void;
  sendAmount: string;
  setSendAmount: (value: string) => void;
  sendToken: string | null;
  receiveToken: string;
  setReceiveToken: (value: string) => void;
  onCreateWallet: () => void;
  onCreateDeposit: () => void;
  onSaveMints: () => void;
  onSendToken: () => void;
  onCopySendToken: (value: string) => void;
  onReceiveToken: () => void;
  onRefresh: () => void;
  onCopyInvoice: (value: string) => void;
};

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

export function CashuSection({
  colors,
  currentPubkey,
  status,
  hasWallet,
  balance,
  busy,
  mints,
  relays,
  createMints,
  setCreateMints,
  createRelays,
  setCreateRelays,
  depositAmount,
  setDepositAmount,
  depositInvoice,
  editMints,
  setEditMints,
  editRelays,
  setEditRelays,
  sendAmount,
  setSendAmount,
  sendToken,
  receiveToken,
  setReceiveToken,
  onCreateWallet,
  onCreateDeposit,
  onSaveMints,
  onSendToken,
  onCopySendToken,
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
          relays={relays}
          depositAmount={depositAmount}
          setDepositAmount={setDepositAmount}
          onCreateDeposit={onCreateDeposit}
          depositInvoice={depositInvoice}
          onCopyInvoice={onCopyInvoice}
          editMints={editMints}
          setEditMints={setEditMints}
          editRelays={editRelays}
          setEditRelays={setEditRelays}
          onSaveMints={onSaveMints}
          sendAmount={sendAmount}
          setSendAmount={setSendAmount}
          onSendToken={onSendToken}
          sendToken={sendToken}
          onCopySendToken={onCopySendToken}
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
