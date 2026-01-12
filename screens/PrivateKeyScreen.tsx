import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ndk } from '../lib/ndk';
import { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk-mobile';

export default function PrivateKeyScreen() {
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [isSet, setIsSet] = useState(false);
  const [message, setMessage] = useState('');

  const handleSetPrivateKey = async () => {
    if (!privateKey.trim()) {
      setMessage('Please enter a private key');
      return;
    }

    try {
      // Create signer from the private key (hex format)
      const signer = new NDKPrivateKeySigner(privateKey.trim());

      // Get the public key to show the user
      const user = await signer.user();
      const pubkey = user.pubkey;

      // Set the signer on NDK
      ndk.signer = signer;

      setPublicKey(pubkey);
      setIsSet(true);
      setMessage('Private key set successfully!');
    } catch (error) {
      setMessage(`Failed to set private key: ${error instanceof Error ? error.message : 'Invalid format'}`);
      setIsSet(false);
      setPublicKey('');
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Private Key',
      'Are you sure you want to remove the private key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setPrivateKey('');
            setPublicKey('');
            setIsSet(false);
            setMessage('');
            ndk.signer = undefined;
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Private Key</Text>
      <Text style={styles.description}>
        Enter your Nostr private key (hex format) to sign events
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Private Key (hex)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter private key in hex format..."
          value={privateKey}
          onChangeText={setPrivateKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!isSet}
          editable={!isSet}
          multiline
        />
      </View>

      {!isSet ? (
        <TouchableOpacity style={styles.button} onPress={handleSetPrivateKey}>
          <Text style={styles.buttonText}>Set Private Key</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleClear}>
          <Text style={styles.buttonText}>Clear Private Key</Text>
        </TouchableOpacity>
      )}

      {message ? (
        <Text style={[styles.message, message.includes('Failed') ? styles.error : styles.success]}>
          {message}
        </Text>
      ) : null}

      {publicKey ? (
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Your Public Key:</Text>
          <View style={styles.publicKeyBox}>
            <Text style={styles.publicKeyText} selectable>
              {publicKey}
            </Text>
          </View>
          <Text style={styles.infoNote}>
            This is your Nostr identity. Share this with others to be identified.
          </Text>
        </View>
      ) : null}

      <View style={styles.warningContainer}>
        <Text style={styles.warningTitle}>⚠️ Security Warning</Text>
        <Text style={styles.warningText}>
          • Never share your private key with anyone{'\n'}
          • Use test keys only for development{'\n'}
          • Private keys are stored in memory only{'\n'}
          • They will be cleared when you close the app
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  dangerButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
  },
  success: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  publicKeyBox: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  publicKeyText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#1f2937',
  },
  infoNote: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
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
