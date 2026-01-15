import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  useNip55,
  NDKNip55Signer,
  useNDKSessionLogin,
  useNDK,
  NDKPrivateKeySigner,
  NDKNip46Signer,
} from '@nostr-dev-kit/mobile';
import type { SignerAppInfo } from 'expo-nip55';

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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Welcome to Eventinel</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Connecting...</Text>
        </View>
      )}

      {/* NIP-55 Section (Android Only) */}
      {isAndroid && isAvailable && apps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Device Signer (Recommended)</Text>
          <Text style={styles.sectionDescription}>
            Sign in with an installed signer app. Your keys never leave the device.
          </Text>

          {apps.map((app) => (
            <TouchableOpacity
              key={app.packageName}
              style={[styles.button, styles.primaryButton]}
              onPress={() => handleNip55Login(app)}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                Login with {app.name || app.packageName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* NIP-46 Bunker Section (iOS Primary, Android Optional) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isIOS ? '🔐 Remote Signer (Recommended)' : '🌐 Remote Signer (NIP-46)'}
        </Text>
        <Text style={styles.sectionDescription}>
          Connect to a Nostr bunker for secure remote signing.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="bunker://pubkey?relay=wss://..."
          placeholderTextColor="#9ca3af"
          value={bunkerUrl}
          onChangeText={setBunkerUrl}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.button, isIOS ? styles.primaryButton : styles.secondaryButton]}
          onPress={handleBunkerLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Connect to Bunker</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Entry Section (Fallback for Both) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔑 Manual Login (Testing Only)</Text>
        <Text style={styles.sectionDescription}>
          Enter your private key directly. Use test keys only!
        </Text>

        <TextInput
          style={styles.input}
          placeholder="nsec1... or hex private key"
          placeholderTextColor="#9ca3af"
          value={manualKey}
          onChangeText={setManualKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.button, styles.tertiaryButton]}
          onPress={handleManualLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Login with Private Key</Text>
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Security Warning */}
      <View style={styles.warningContainer}>
        <Text style={styles.warningTitle}>⚠️ Security Notice</Text>
        <Text style={styles.warningText}>
          {isAndroid
            ? '• NIP-55 signer apps (Amber) are most secure\n'
            : '• NIP-46 bunkers are most secure for iOS\n'}
          • Never share your private key{'\n'}
          • Use test keys for development only{'\n'}
          • Keys are encrypted and stored securely
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  loadingOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#374151',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    fontFamily: 'monospace',
    color: '#1f2937',
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#7c3aed',
  },
  tertiaryButton: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
  warningContainer: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
});
