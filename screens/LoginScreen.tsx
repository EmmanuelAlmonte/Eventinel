/**
 * LoginScreen
 *
 * Guided Nostr authentication with one active method at a time.
 */

import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { ScreenContainer } from '@components/ui';
import { useAppTheme } from '@hooks';

import {
  GeneratedKeyOverlay,
  LoginHeader,
  LoginLoadingOverlay,
  NostrConnectOverlay,
  UnifiedAuthCard,
  type LoginMethod,
} from './login/LoginSections';
import { useLoginMethods } from './login/useLoginMethods';

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const isAndroid = Platform.OS === 'android';
  const [selectedMethod, setSelectedMethod] = useState<LoginMethod>('signer');
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

        <UnifiedAuthCard
          colors={colors}
          selectedMethod={selectedMethod}
          onSelectMethod={setSelectedMethod}
          isAndroid={isAndroid && isAvailable}
          apps={apps}
          remoteSignerInput={remoteSignerInput}
          setRemoteSignerInput={setRemoteSignerInput}
          forceLegacyNip04={forceLegacyNip04}
          setForceLegacyNip04={setForceLegacyNip04}
          nostrConnectRelay={nostrConnectRelay}
          setNostrConnectRelay={setNostrConnectRelay}
          manualKey={manualKey}
          setManualKey={setManualKey}
          isLoading={isLoading}
          onNip55Login={(app) => void handleNip55Login(app)}
          onRemoteSignerLogin={() => void handleRemoteSignerLogin()}
          onGenerateNostrConnect={() => void handleStartNostrConnect()}
          onGenerateKey={() => void handleGenerateKey()}
          onManualLogin={() => void handleManualLogin()}
        />
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
