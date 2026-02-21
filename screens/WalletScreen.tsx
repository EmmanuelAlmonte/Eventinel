/**
 * WalletScreen
 *
 * Configure Lightning (NWC) and Cashu (NIP-60) wallets.
 */

import { View } from 'react-native';
import { Icon, Text } from '@rneui/themed';
import { useNDKCurrentUser } from '@nostr-dev-kit/mobile';

import { ScreenContainer } from '@components/ui';
import { useAppTheme } from '@hooks';
import { isCashuWalletFeatureEnabled, isLightningWalletFeatureEnabled } from '@lib/featureFlags';

import { CashuSection, NwcSection } from './wallet/WalletSections';
import { walletScreenStyles as styles } from './wallet/styles';
import { useCashuWallet } from './wallet/useCashuWallet';
import { useNwcWallet } from './wallet/useNwcWallet';

export default function WalletScreen() {
  const { colors } = useAppTheme();
  const currentUser = useNDKCurrentUser();
  const lightningEnabled = isLightningWalletFeatureEnabled;
  const nwc = useNwcWallet(lightningEnabled);
  const cashuEnabled = isCashuWalletFeatureEnabled;
  const cashu = useCashuWallet(cashuEnabled ? currentUser?.pubkey : undefined, cashuEnabled);
  const walletSubtitle =
    lightningEnabled && cashuEnabled
      ? 'Lightning via NWC and Cashu (NIP-60)'
      : lightningEnabled
        ? 'Lightning via NWC'
        : cashuEnabled
          ? 'Cashu (NIP-60)'
          : 'Wallet features are disabled in this build';

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text h2 style={[styles.title, { color: colors.text }]}>Wallet</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{walletSubtitle}</Text>
      </View>

      {lightningEnabled ? (
        <NwcSection
          colors={colors}
          wallet={nwc.nwcWallet}
          info={nwc.nwcInfo}
          status={nwc.nwcStatus}
          balance={nwc.nwcBalance}
          busy={nwc.nwcBusy}
          pairingCodeInput={nwc.nwcPairingCodeInput}
          setPairingCodeInput={nwc.setNwcPairingCodeInput}
          payInvoice={nwc.nwcPayInvoice}
          setPayInvoice={nwc.setNwcPayInvoice}
          makeAmount={nwc.nwcMakeAmount}
          setMakeAmount={nwc.setNwcMakeAmount}
          makeDescription={nwc.nwcMakeDesc}
          setMakeDescription={nwc.setNwcMakeDesc}
          createdInvoice={nwc.nwcCreatedInvoice}
          connectionSummary={nwc.nwcConnectionSummary}
          onConnect={() => void nwc.connectNwc(nwc.nwcPairingCodeInput, { persist: true })}
          onDisconnect={() => void nwc.disconnectNwc()}
          onPayInvoice={() => void nwc.handleNwcPay()}
          onCreateInvoice={() => void nwc.handleNwcMakeInvoice()}
          onCopyInvoice={(value) => void nwc.copyToClipboard(value, 'Invoice')}
        />
      ) : null}

      {cashuEnabled ? (
        <CashuSection
          colors={colors}
          currentPubkey={currentUser?.pubkey}
          status={cashu.cashuStatus}
          hasWallet={Boolean(cashu.cashuWallet)}
          balance={cashu.cashuBalance}
          busy={cashu.cashuBusy}
          mints={cashu.cashuWallet?.mints}
          createMints={cashu.cashuCreateMints}
          setCreateMints={cashu.setCashuCreateMints}
          createRelays={cashu.cashuCreateRelays}
          setCreateRelays={cashu.setCashuCreateRelays}
          depositAmount={cashu.cashuDepositAmount}
          setDepositAmount={cashu.setCashuDepositAmount}
          depositInvoice={cashu.cashuDepositInvoice}
          sendAmount={cashu.cashuSendAmount}
          setSendAmount={cashu.setCashuSendAmount}
          sendToken={cashu.cashuSendToken}
          receiveToken={cashu.cashuReceiveToken}
          setReceiveToken={cashu.setCashuReceiveToken}
          onCreateWallet={() => void cashu.handleCreateCashuWallet()}
          onCreateDeposit={() => void cashu.handleCashuDeposit()}
          onSendToken={() => void cashu.handleCashuSendToken()}
          onCopySendToken={(value) => void nwc.copyToClipboard(value, 'Token')}
          onReceiveToken={() => void cashu.handleCashuReceiveToken()}
          onRefresh={() => void cashu.refreshCashuWallet()}
          onCopyInvoice={(value) => void nwc.copyToClipboard(value, 'Invoice')}
        />
      ) : null}

      {!lightningEnabled && !cashuEnabled ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Enable wallet feature flags in a dev build to configure Lightning/Cashu.
        </Text>
      ) : null}
    </ScreenContainer>
  );
}
