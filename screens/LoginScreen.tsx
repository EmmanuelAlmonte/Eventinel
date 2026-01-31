/**
 * LoginScreen
 *
 * Multi-method Nostr authentication screen.
 * Supports NIP-55 (device signer), NIP-46 (bunker), and manual key entry.
 */

import { useState } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, Linking, Switch } from 'react-native';
import { Text, Button, Input, Card, Icon, Overlay } from '@rneui/themed';
import * as Clipboard from 'expo-clipboard';
import {
  useNip55,
  NDKNip55Signer,
  useNDKSessionLogin,
  useNDK,
  NDKPrivateKeySigner,
  NDKNip46Signer,
} from '@nostr-dev-kit/mobile';
import type { SignerAppInfo } from 'expo-nip55';

import { ScreenContainer, showToast } from '@components/ui';
import { useAppTheme } from '@hooks';

export default function LoginScreen() {
  const { ndk } = useNDK();
  const { isAvailable, apps } = useNip55(); // Android only
  const login = useNDKSessionLogin();
  const [manualKey, setManualKey] = useState('');
  const [remoteSignerInput, setRemoteSignerInput] = useState('');
  const [nostrConnectRelay, setNostrConnectRelay] = useState('');
  const [nostrConnectUri, setNostrConnectUri] = useState<string | null>(null);
  const [nostrConnectSigner, setNostrConnectSigner] = useState<NDKNip46Signer | null>(null);
  const [forceLegacyNip04, setForceLegacyNip04] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatedPubkey, setGeneratedPubkey] = useState<string | null>(null);
  const [generatedSigner, setGeneratedSigner] = useState<NDKPrivateKeySigner | null>(null);

  // Get theme-aware colors
  const { colors, isDark } = useAppTheme();

  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  // Handle NIP-55 login (Android only)
  const handleNip55Login = async (app: SignerAppInfo) => {
    setIsLoading(true);
    try {
      const signer = new NDKNip55Signer(app.packageName);
      await signer.blockUntilReady();
      await login(signer, true);
    } catch (err) {
      showToast.error('Login Failed', err instanceof Error ? err.message : 'NIP-55 login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const isNip05Identifier = (value: string) => value.includes('@') && !value.includes('://');

  // Handle NIP-46 remote signer login (bunker:// or NIP-05)
  const handleRemoteSignerLogin = async () => {
    const trimmed = remoteSignerInput.trim();
    if (!trimmed) {
      showToast.warning('Missing Identifier', 'Please enter a bunker URL or NIP-05 identifier');
      return;
    }
    if (trimmed.startsWith('nostrconnect://')) {
      showToast.warning('Use Nostr Connect', 'Generate a nostrconnect:// URI below');
      return;
    }
    if (!trimmed.startsWith('bunker://') && !isNip05Identifier(trimmed)) {
      showToast.error('Invalid Identifier', 'Enter a bunker:// URL or name@domain');
      return;
    }
    if (!ndk) {
      showToast.error('Error', 'NDK not initialized');
      return;
    }

    setIsLoading(true);
    try {
      const signer = NDKNip46Signer.bunker(ndk, trimmed);
      signer.on?.('authUrl', (url: string) => {
        Linking.openURL(url).catch(() => {
          showToast.warning('Action required', 'Open the authorization URL in a browser');
        });
      });
      if (forceLegacyNip04 && (signer as any).rpc) {
        (signer as any).rpc.encryptionType = 'nip04';
      }
      await signer.blockUntilReady();
      await login(signer, true);
    } catch (err) {
      showToast.error(
        'Connection Failed',
        err instanceof Error ? err.message : 'Remote signer connection failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNostrConnect = async () => {
    const relay = nostrConnectRelay.trim();
    if (!relay) {
      showToast.warning('Missing Relay', 'Please enter a relay URL');
      return;
    }
    if (!relay.startsWith('wss://') && !relay.startsWith('ws://')) {
      showToast.warning('Invalid Relay', 'Relay URL must start with wss:// or ws://');
      return;
    }
    if (!ndk) {
      showToast.error('Error', 'NDK not initialized');
      return;
    }

    try {
      const signer = NDKNip46Signer.nostrconnect(ndk, relay);
      signer.on?.('authUrl', (url: string) => {
        Linking.openURL(url).catch(() => {
          showToast.warning('Action required', 'Open the authorization URL in a browser');
        });
      });
      if (!signer.nostrConnectUri) {
        showToast.error('Failed to generate', 'Unable to build Nostr Connect URI');
        return;
      }
      setNostrConnectSigner(signer);
      setNostrConnectUri(signer.nostrConnectUri);
    } catch (err) {
      showToast.error(
        'Failed to generate',
        err instanceof Error ? err.message : 'Unable to start Nostr Connect flow'
      );
    }
  };

  const handleCopyNostrConnect = async () => {
    if (!nostrConnectUri) return;
    try {
      await Clipboard.setStringAsync(nostrConnectUri);
      showToast.success('Copied', 'Nostr Connect URI copied');
    } catch (err) {
      showToast.warning('Clipboard unavailable', 'Copy the URI manually');
    }
  };

  const handleOpenNostrConnect = async () => {
    if (!nostrConnectUri) return;
    try {
      await Linking.openURL(nostrConnectUri);
    } catch (err) {
      showToast.warning('Open failed', 'Unable to open signer app');
    }
  };

  const handleCompleteNostrConnect = async () => {
    if (!nostrConnectSigner) return;
    setIsLoading(true);
    try {
      await nostrConnectSigner.blockUntilReady();
      await login(nostrConnectSigner, true);
      setNostrConnectSigner(null);
      setNostrConnectUri(null);
    } catch (err) {
      showToast.error(
        'Connection Failed',
        err instanceof Error ? err.message : 'Nostr Connect failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const dismissNostrConnect = () => {
    setNostrConnectSigner(null);
    setNostrConnectUri(null);
  };

  // Handle manual key login (fallback for both platforms)
  const handleManualLogin = async () => {
    if (!manualKey.trim()) {
      showToast.warning('Missing Key', 'Please enter a private key');
      return;
    }

    setIsLoading(true);
    try {
      const signer = new NDKPrivateKeySigner(manualKey.trim());
      await signer.user();
      await login(signer, true);
    } catch (err) {
      // Generic error - don't leak validation details
      showToast.error('Login Failed', 'Please check your key and try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    try {
      const signer = NDKPrivateKeySigner.generate();
      const nsec = signer.nsec;
      setGeneratedSigner(signer);
      setGeneratedKey(nsec);
      setGeneratedPubkey(signer.npub);

      try {
        await Clipboard.setStringAsync(nsec);
        showToast.success('Copied to clipboard', 'New private key copied');
      } catch (err) {
        showToast.warning('Clipboard unavailable', 'Copy the key manually');
      }
    } catch (err) {
      showToast.error('Key Generation Failed', 'Please try again');
    }
  };

  const handleGeneratedLogin = async () => {
    if (!generatedSigner) return;

    setIsLoading(true);
    try {
      await login(generatedSigner, true);
      setGeneratedKey(null);
      setGeneratedPubkey(null);
      setGeneratedSigner(null);
    } catch (err) {
      showToast.error('Login Failed', 'Unable to use generated key');
    } finally {
      setIsLoading(false);
    }
  };

  const dismissGeneratedKey = () => {
    setGeneratedKey(null);
    setGeneratedPubkey(null);
    setGeneratedSigner(null);
  };

  // Dynamic styles based on theme
  const themedStyles = {
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    input: {
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    inputText: {
      color: colors.text,
    },
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenContainer scroll>
      {/* Header */}
      <View style={styles.header}>
        <Text h1 style={[styles.title, { color: colors.text }]}>Welcome to Eventinel</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Sign in to continue</Text>
      </View>

      {/* Loading Overlay */}
      <Overlay
        isVisible={isLoading}
        overlayStyle={[styles.loadingOverlay, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.loadingContent}>
          <Icon
            name="sync"
            type="material"
            size={48}
            color={colors.primary}
          />
          <Text style={[styles.loadingText, { color: colors.text }]}>Connecting...</Text>
        </View>
      </Overlay>

      {/* Generated Key Overlay */}
      <Overlay
        isVisible={Boolean(generatedKey)}
        overlayStyle={[styles.keyOverlay, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onBackdropPress={dismissGeneratedKey}
      >
        <View style={styles.keyContent}>
          <View style={styles.cardHeader}>
            <Icon name="key" type="material" size={22} color={colors.warning} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>New Test Key</Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
            Save this private key. Anyone with it can control the account.
          </Text>
          {generatedKey ? (
            <Text
              selectable
              style={[styles.generatedKeyText, { color: colors.text, borderColor: colors.border }]}
            >
              {generatedKey}
            </Text>
          ) : null}
          {generatedPubkey ? (
            <Text style={[styles.generatedPubkeyText, { color: colors.textMuted }]}>
              Public key: {generatedPubkey}
            </Text>
          ) : null}
          <Button
            title="Use this key to login"
            onPress={handleGeneratedLogin}
            disabled={isLoading}
            containerStyle={styles.buttonContainer}
            icon={
              <Icon
                name="login"
                type="material"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
            }
          />
          <Button
            title="Close"
            type="clear"
            onPress={dismissGeneratedKey}
            disabled={isLoading}
            titleStyle={{ color: colors.textMuted }}
          />
        </View>
      </Overlay>

      {/* Nostr Connect Overlay */}
      <Overlay
        isVisible={Boolean(nostrConnectUri)}
        overlayStyle={[styles.keyOverlay, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onBackdropPress={dismissNostrConnect}
      >
        <View style={styles.keyContent}>
          <View style={styles.cardHeader}>
            <Icon name="link" type="material" size={22} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Nostr Connect</Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
            Open this URI in your signer app to authorize Eventinel.
          </Text>
          {nostrConnectUri ? (
            <Text
              selectable
              style={[styles.generatedKeyText, { color: colors.text, borderColor: colors.border }]}
            >
              {nostrConnectUri}
            </Text>
          ) : null}
          <Button
            title="Copy URI"
            onPress={handleCopyNostrConnect}
            disabled={isLoading}
            containerStyle={styles.buttonContainer}
            type="outline"
            buttonStyle={{ borderColor: colors.primary }}
            titleStyle={{ color: colors.primary }}
          />
          <Button
            title="Open Signer"
            onPress={handleOpenNostrConnect}
            disabled={isLoading}
            containerStyle={styles.buttonContainer}
            icon={
              <Icon
                name="open-in-new"
                type="material"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
            }
          />
          <Button
            title="I Approved in Signer"
            onPress={handleCompleteNostrConnect}
            disabled={isLoading}
            containerStyle={styles.buttonContainer}
          />
          <Button
            title="Cancel"
            type="clear"
            onPress={dismissNostrConnect}
            disabled={isLoading}
            titleStyle={{ color: colors.textMuted }}
          />
        </View>
      </Overlay>

      {/* NIP-55 Section (Android Only) */}
      {isAndroid && isAvailable && apps.length > 0 && (
        <Card containerStyle={[styles.card, themedStyles.card]}>
          <View style={styles.cardHeader}>
            <Icon
              name="security"
              type="material"
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Device Signer</Text>
            <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
            Sign in with an installed signer app. Your keys never leave the device.
          </Text>

          {apps.map((app) => (
            <Button
              key={app.packageName}
              title={`Login with ${app.name || app.packageName}`}
              onPress={() => handleNip55Login(app)}
              disabled={isLoading}
              containerStyle={styles.buttonContainer}
              icon={
                <Icon
                  name="key"
                  type="material"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
              }
            />
          ))}
        </Card>
      )}

      {/* NIP-46 Remote Signer Section */}
      <Card containerStyle={[styles.card, themedStyles.card]}>
        <View style={styles.cardHeader}>
          <Icon
            name="cloud"
            type="material"
            size={24}
            color={isIOS ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Remote Signer (NIP-46)</Text>
          {isIOS && (
            <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
          Connect via bunker:// or NIP-05 (name@domain) for secure remote signing.
        </Text>

        <Input
          placeholder="bunker://pubkey?relay=wss://... or name@domain"
          value={remoteSignerInput}
          onChangeText={setRemoteSignerInput}
          autoCapitalize="none"
          autoCorrect={false}
          disabled={isLoading}
          leftIcon={
            <Icon
              name="link"
              type="material"
              size={20}
              color={colors.textMuted}
            />
          }
          containerStyle={styles.inputContainer}
          inputContainerStyle={[styles.input, themedStyles.input]}
          inputStyle={[styles.inputText, themedStyles.inputText]}
          placeholderTextColor={colors.textMuted}
        />

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.textMuted }]}>
            Legacy NIP-04 (if bunker doesn't support NIP-44)
          </Text>
          <Switch
            value={forceLegacyNip04}
            onValueChange={setForceLegacyNip04}
            disabled={isLoading}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={forceLegacyNip04 ? colors.primary : colors.textMuted}
          />
        </View>

        <Button
          title="Connect to Remote Signer"
          onPress={handleRemoteSignerLogin}
          disabled={isLoading}
          containerStyle={styles.buttonContainer}
          buttonStyle={isIOS ? undefined : { backgroundColor: colors.primaryDark }}
          icon={
            <Icon
              name="login"
              type="material"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
          }
        />
      </Card>

      {/* NIP-46 Nostr Connect Section */}
      <Card containerStyle={[styles.card, themedStyles.card]}>
        <View style={styles.cardHeader}>
          <Icon
            name="link"
            type="material"
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Nostr Connect (NIP-46)</Text>
        </View>
        <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
          Generate a nostrconnect:// URI and open it in a signer app.
        </Text>

        <Input
          placeholder="wss://relay.example.com"
          value={nostrConnectRelay}
          onChangeText={setNostrConnectRelay}
          autoCapitalize="none"
          autoCorrect={false}
          disabled={isLoading}
          leftIcon={
            <Icon
              name="dns"
              type="material"
              size={20}
              color={colors.textMuted}
            />
          }
          containerStyle={styles.inputContainer}
          inputContainerStyle={[styles.input, themedStyles.input]}
          inputStyle={[styles.inputText, themedStyles.inputText]}
          placeholderTextColor={colors.textMuted}
        />

        <Button
          title="Generate Nostr Connect"
          onPress={handleStartNostrConnect}
          disabled={isLoading}
          containerStyle={styles.buttonContainer}
          icon={
            <Icon
              name="qr-code"
              type="material"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
          }
        />
      </Card>

      {/* Manual Entry Section */}
      <Card containerStyle={[styles.card, themedStyles.card]}>
        <View style={styles.cardHeader}>
          <Icon
            name="vpn-key"
            type="material"
            size={24}
            color={colors.warning}
          />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Manual Login</Text>
          <View style={[styles.testOnlyBadge, { backgroundColor: colors.warning }]}>
            <Text style={styles.testOnlyText}>Testing Only</Text>
          </View>
        </View>
        <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
          Enter your private key directly. Use test keys only!
        </Text>

        <Input
          placeholder="nsec1... or hex private key"
          value={manualKey}
          onChangeText={setManualKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          disabled={isLoading}
          leftIcon={
            <Icon
              name="lock"
              type="material"
              size={20}
              color={colors.textMuted}
            />
          }
          containerStyle={styles.inputContainer}
          inputContainerStyle={[styles.input, themedStyles.input]}
          inputStyle={[styles.inputText, themedStyles.inputText]}
          placeholderTextColor={colors.textMuted}
        />

        <Button
          title="Create New Test Key"
          onPress={handleGenerateKey}
          disabled={isLoading}
          containerStyle={styles.buttonContainer}
          type="outline"
          buttonStyle={{ borderColor: colors.warning }}
          titleStyle={{ color: colors.warning }}
          icon={
            <Icon
              name="add-circle-outline"
              type="material"
              size={20}
              color={colors.warning}
              style={{ marginRight: 8 }}
            />
          }
        />

        <Button
          title="Login with Private Key"
          onPress={handleManualLogin}
          disabled={isLoading}
          containerStyle={styles.buttonContainer}
          buttonStyle={{ backgroundColor: '#52525B' }}
          icon={
            <Icon
              name="key"
              type="material"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
          }
        />
      </Card>

      {/* Security Warning */}
      <Card containerStyle={[styles.warningCard, { borderColor: `${colors.warning}40` }]}>
        <View style={styles.cardHeader}>
          <Icon
            name="warning"
            type="material"
            size={24}
            color={colors.warning}
          />
          <Text style={[styles.warningTitle, { color: colors.warning }]}>Security Notice</Text>
        </View>
        <Text style={[styles.warningText, { color: colors.textMuted }]}>
          {isAndroid
            ? '• NIP-55 signer apps (Amber) are most secure\n'
            : '• NIP-46 bunkers are most secure for iOS\n'}
          • Never share your private key{'\n'}
          • Use test keys for development only{'\n'}
          • Keys are encrypted and stored securely
        </Text>
      </Card>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  loadingOverlay: {
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    margin: 0,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  testOnlyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  testOnlyText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  inputContainer: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 12,
    marginRight: 12,
  },
  buttonContainer: {
    marginTop: 4,
  },
  keyOverlay: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    width: '90%',
    maxWidth: 420,
  },
  keyContent: {
    gap: 12,
  },
  generatedKeyText: {
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  generatedPubkeyText: {
    fontSize: 12,
  },
  warningCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    margin: 0,
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
});
