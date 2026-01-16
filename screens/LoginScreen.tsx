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

import { ScreenContainer, useAppTheme } from '../lib/ui';

export default function LoginScreen() {
  const { ndk } = useNDK();
  const { isAvailable, apps } = useNip55(); // Android only
  const login = useNDKSessionLogin();
  const [manualKey, setManualKey] = useState('');
  const [bunkerUrl, setBunkerUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Get theme-aware colors
  const { colors, isDark } = useAppTheme();

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

      {/* NIP-46 Bunker Section */}
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
              color={colors.textMuted}
            />
          }
          containerStyle={styles.inputContainer}
          inputContainerStyle={[styles.input, themedStyles.input]}
          inputStyle={[styles.inputText, themedStyles.inputText]}
          placeholderTextColor={colors.textMuted}
        />

        <Button
          title="Connect to Bunker"
          onPress={handleBunkerLogin}
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

      {/* Error Display */}
      {error ? (
        <View style={[styles.errorContainer, { borderColor: `${colors.error}40` }]}>
          <Icon
            name="error-outline"
            type="material"
            size={20}
            color={colors.error}
          />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : null}

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
  buttonContainer: {
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
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
