/**
 * LoginScreen
 *
 * Multi-method Nostr authentication (NIP-55, NIP-46, manual test keys).
 */

import { KeyboardAvoidingView, Platform } from 'react-native';

import { ScreenContainer } from '@components/ui';
import { useAppTheme } from '@hooks';

import {
  GeneratedKeyOverlay,
  LoginHeader,
  LoginLoadingOverlay,
  ManualLoginCard,
  Nip55Card,
  NostrConnectCard,
  NostrConnectOverlay,
  RemoteSignerCard,
  SecurityNoticeCard,
} from './login/LoginSections';
import { useLoginMethods } from './login/useLoginMethods';

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  const {
    isAvailable,
    apps,
    manualKey,
    setManualKey,
    remoteSignerInput,
    setRemoteSignerInput,
    nostrConnectRelay,
    setNostrConnectRelay,
    nostrConnectUri,
    forceLegacyNip04,
    setForceLegacyNip04,
    isLoading,
    generatedKey,
    generatedPubkey,
    handleNip55Login,
    handleRemoteSignerLogin,
    handleStartNostrConnect,
    handleCopyNostrConnect,
    handleOpenNostrConnect,
    handleCompleteNostrConnect,
    handleManualLogin,
    handleGenerateKey,
    handleGeneratedLogin,
    dismissGeneratedKey,
    dismissNostrConnect,
  } = useLoginMethods();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenContainer scroll>
        <LoginHeader colors={colors} />
        <LoginLoadingOverlay colors={colors} isVisible={isLoading} />

        <GeneratedKeyOverlay
          colors={colors}
          generatedKey={generatedKey}
          generatedPubkey={generatedPubkey}
          isLoading={isLoading}
          onUseKey={() => void handleGeneratedLogin()}
          onDismiss={dismissGeneratedKey}
        />

        <NostrConnectOverlay
          colors={colors}
          uri={nostrConnectUri}
          isLoading={isLoading}
          onCopy={() => void handleCopyNostrConnect()}
          onOpen={() => void handleOpenNostrConnect()}
          onComplete={() => void handleCompleteNostrConnect()}
          onDismiss={dismissNostrConnect}
        />

        {isAndroid && isAvailable && apps.length > 0 ? (
          <Nip55Card
            colors={colors}
            apps={apps}
            isLoading={isLoading}
            onLogin={(app) => void handleNip55Login(app)}
          />
        ) : null}

        <RemoteSignerCard
          colors={colors}
          isIOS={isIOS}
          input={remoteSignerInput}
          setInput={setRemoteSignerInput}
          forceLegacyNip04={forceLegacyNip04}
          setForceLegacyNip04={setForceLegacyNip04}
          isLoading={isLoading}
          onConnect={() => void handleRemoteSignerLogin()}
        />

        <NostrConnectCard
          colors={colors}
          relay={nostrConnectRelay}
          setRelay={setNostrConnectRelay}
          isLoading={isLoading}
          onGenerate={() => void handleStartNostrConnect()}
        />

        <ManualLoginCard
          colors={colors}
          manualKey={manualKey}
          setManualKey={setManualKey}
          isLoading={isLoading}
          onGenerate={() => void handleGenerateKey()}
          onLogin={() => void handleManualLogin()}
        />

        <SecurityNoticeCard colors={colors} isAndroid={isAndroid} />
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
