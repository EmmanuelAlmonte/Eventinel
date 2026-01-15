/**
 * LoginScreen
 *
 * Multi-method Nostr authentication screen.
 * Supports NIP-55 (device signer), NIP-46 (bunker), and manual key entry.
 */

import { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Button, Input, Card, Icon, Overlay } from '@rneui/themed';
import {
  useNip55,
  NDKNip55Signer,
  useNDKSessionLogin,
  useNDK,
  NDKPrivateKeySigner,
  NDKNip46Signer,
} from '@nostr-dev-kit/mobile';
import type { SignerAppInfo } from 'expo-nip55';

import { ScreenContainer, SectionHeader } from '../lib/ui';
import { PRIMARY, SEMANTIC, NEUTRAL } from '../lib/brand/colors';

export default function LoginScreen() {
  const { ndk } = useNDK();
  const { isAvailable, apps } = useNip55(); // Android only
  const login = useNDKSessionLogin();
  const [manualKey, setManualKey] = useState('');
  const [bunkerUrl, setBunkerUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  // Handle NIP-55 login (Android only)
  const handleNip55Login = async (app: SignerAppInfo) => {
    setIsLoading(true);
    setError('');
    try {
      const signer = new NDKNip55Signer(app.packageName);
      await signer.blockUntilReady();
      await login(signer, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'NIP-55 login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle NIP-46 bunker login (iOS primary, Android optional)
  const handleBunkerLogin = async () => {
    if (!bunkerUrl.trim()) {
      setError('Please enter a bunker URL');
      return;
    }
    if (!ndk) {
      setError('NDK not initialized');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const signer = new NDKNip46Signer(ndk, bunkerUrl.trim());
      await signer.blockUntilReady();
      await login(signer, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bunker connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual key login (fallback for both platforms)
  const handleManualLogin = async () => {
    if (!manualKey.trim()) {
      setError('Please enter a private key');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const signer = new NDKPrivateKeySigner(manualKey.trim());
      await signer.user();
      await login(signer, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid private key');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer scroll>
      {/* Header */}
      <View style={styles.header}>
        <Text h1 style={styles.title}>Welcome to Eventinel</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </View>

      {/* Loading Overlay */}
      <Overlay
        isVisible={isLoading}
        overlayStyle={styles.loadingOverlay}
      >
        <View style={styles.loadingContent}>
          <Icon
            name="sync"
            type="material"
            size={48}
            color={PRIMARY.DEFAULT}
          />
          <Text style={styles.loadingText}>Connecting...</Text>
        </View>
      </Overlay>

      {/* NIP-55 Section (Android Only) */}
      {isAndroid && isAvailable && apps.length > 0 && (
        <Card containerStyle={styles.card}>
          <View style={styles.cardHeader}>
            <Icon
              name="security"
              type="material"
              size={24}
              color={PRIMARY.DEFAULT}
            />
            <Text style={styles.cardTitle}>Device Signer</Text>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>
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

      {/* NIP-46 Bunker Section */}
      <Card containerStyle={styles.card}>
        <View style={styles.cardHeader}>
          <Icon
            name="cloud"
            type="material"
            size={24}
            color={isIOS ? PRIMARY.DEFAULT : NEUTRAL.textMuted}
          />
          <Text style={styles.cardTitle}>Remote Signer (NIP-46)</Text>
          {isIOS && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardDescription}>
          Connect to a Nostr bunker for secure remote signing.
        </Text>

        <Input
          placeholder="bunker://pubkey?relay=wss://..."
          value={bunkerUrl}
          onChangeText={setBunkerUrl}
          autoCapitalize="none"
          autoCorrect={false}
          disabled={isLoading}
          leftIcon={
            <Icon
              name="link"
              type="material"
              size={20}
              color={NEUTRAL.textMuted}
            />
          }
          containerStyle={styles.inputContainer}
          inputContainerStyle={styles.input}
          inputStyle={styles.inputText}
        />

        <Button
          title="Connect to Bunker"
          onPress={handleBunkerLogin}
          disabled={isLoading}
          containerStyle={styles.buttonContainer}
          buttonStyle={isIOS ? undefined : styles.secondaryButton}
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

      {/* Manual Entry Section */}
      <Card containerStyle={styles.card}>
        <View style={styles.cardHeader}>
          <Icon
            name="vpn-key"
            type="material"
            size={24}
            color={SEMANTIC.warning}
          />
          <Text style={styles.cardTitle}>Manual Login</Text>
          <View style={styles.testOnlyBadge}>
            <Text style={styles.testOnlyText}>Testing Only</Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>
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
              color={NEUTRAL.textMuted}
            />
          }
          containerStyle={styles.inputContainer}
          inputContainerStyle={styles.input}
          inputStyle={styles.inputText}
        />

        <Button
          title="Login with Private Key"
          onPress={handleManualLogin}
          disabled={isLoading}
          containerStyle={styles.buttonContainer}
          buttonStyle={styles.tertiaryButton}
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

      {/* Error Display */}
      {error ? (
        <View style={styles.errorContainer}>
          <Icon
            name="error-outline"
            type="material"
            size={20}
            color={SEMANTIC.alert}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Security Warning */}
      <Card containerStyle={styles.warningCard}>
        <View style={styles.cardHeader}>
          <Icon
            name="warning"
            type="material"
            size={24}
            color={SEMANTIC.warning}
          />
          <Text style={styles.warningTitle}>Security Notice</Text>
        </View>
        <Text style={styles.warningText}>
          {isAndroid
            ? '• NIP-55 signer apps (Amber) are most secure\n'
            : '• NIP-46 bunkers are most secure for iOS\n'}
          • Never share your private key{'\n'}
          • Use test keys for development only{'\n'}
          • Keys are encrypted and stored securely
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  title: {
    color: NEUTRAL.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    color: NEUTRAL.textMuted,
    fontSize: 16,
  },
  loadingOverlay: {
    backgroundColor: NEUTRAL.darkElevated,
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: NEUTRAL.darkBorder,
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: NEUTRAL.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: NEUTRAL.darkElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NEUTRAL.darkBorder,
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
    color: NEUTRAL.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  cardDescription: {
    color: NEUTRAL.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  recommendedBadge: {
    backgroundColor: PRIMARY.DEFAULT,
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
    backgroundColor: SEMANTIC.warning,
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
    borderColor: NEUTRAL.darkBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: NEUTRAL.dark,
  },
  inputText: {
    color: NEUTRAL.textPrimary,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonContainer: {
    marginTop: 4,
  },
  secondaryButton: {
    backgroundColor: PRIMARY.dark,
  },
  tertiaryButton: {
    backgroundColor: '#52525B', // zinc-600
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  errorText: {
    color: SEMANTIC.alert,
    fontSize: 14,
    flex: 1,
  },
  warningCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: 16,
    margin: 0,
    marginBottom: 24,
  },
  warningTitle: {
    color: SEMANTIC.warning,
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    color: NEUTRAL.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
});
