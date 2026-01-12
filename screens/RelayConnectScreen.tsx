import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { ndk } from '../lib/ndk';
import { NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk-mobile';

// Generate or retrieve signer for this session
let sessionSigner: NDKPrivateKeySigner | null = null;

function getSessionSigner() {
  // If user set a key via PrivateKeyScreen, use that
  if (ndk.signer) {
    return ndk.signer;
  }

  // Otherwise generate a temporary one
  if (!sessionSigner) {
    sessionSigner = NDKPrivateKeySigner.generate();
    ndk.signer = sessionSigner;
  }
  return sessionSigner;
}

export default function RelayConnectScreen() {
  const [relayUrl, setRelayUrl] = useState('');
  const [connectedRelays, setConnectedRelays] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [sendStatus, setSendStatus] = useState('');

  useEffect(() => {
    // Update connected relays list
    const updateRelays = () => {
      const relays = Array.from(ndk.pool.relays.values());
      const connected = relays
        .filter(relay => relay.status === 1) // 1 = connected
        .map(relay => relay.url);
      setConnectedRelays(connected);
    };

    updateRelays();
    const interval = setInterval(updateRelays, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    if (!relayUrl.trim()) {
      setMessage('Please enter a relay URL');
      return;
    }

    // Validate URL format
    if (!relayUrl.startsWith('wss://') && !relayUrl.startsWith('ws://')) {
      setMessage('Relay URL must start with wss:// or ws://');
      return;
    }

    try {
      // Add relay to NDK
      const relay = ndk.addExplicitRelay(relayUrl.trim());
      await relay.connect();

      setMessage(`Connected to ${relayUrl}`);
      setRelayUrl('');

      // Update the list immediately
      setTimeout(() => {
        const relays = Array.from(ndk.pool.relays.values());
        const connected = relays
          .filter(relay => relay.status === 1)
          .map(relay => relay.url);
        setConnectedRelays(connected);
      }, 1000);
    } catch (error) {
      setMessage(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSendNote = async () => {
    if (!noteContent.trim()) {
      setSendStatus('Please enter a note');
      return;
    }

    if (connectedRelays.length === 0) {
      setSendStatus('Please connect to at least one relay first');
      return;
    }

    try {
      // Get or create a signer for this session
      getSessionSigner();

      // Create a new note event (kind 1)
      const event = new NDKEvent(ndk);
      event.kind = 1;
      event.content = noteContent.trim();

      // Sign and publish to all connected relays
      await event.sign();
      await event.publish();

      setSendStatus(`Note published to ${connectedRelays.length} relay(s)!`);
      setNoteContent('');

      // Clear status after 3 seconds
      setTimeout(() => setSendStatus(''), 3000);
    } catch (error) {
      setSendStatus(`Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Connect to Relay</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="wss://relay.example.com"
            value={relayUrl}
            onChangeText={setRelayUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.button} onPress={handleConnect}>
            <Text style={styles.buttonText}>Connect</Text>
          </TouchableOpacity>
        </View>

        {message ? (
          <Text style={[styles.message, message.includes('Failed') ? styles.error : styles.success]}>
            {message}
          </Text>
        ) : null}

        <Text style={styles.subtitle}>Connected Relays ({connectedRelays.length})</Text>
        <View style={styles.relayListContainer}>
          {connectedRelays.length === 0 ? (
            <Text style={styles.emptyText}>No relays connected</Text>
          ) : (
            connectedRelays.map((url, index) => (
              <View key={index} style={styles.relayItem}>
                <View style={styles.statusDot} />
                <Text style={styles.relayUrl}>{url}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.divider} />

        <Text style={styles.subtitle}>Send Note</Text>
        <View style={styles.noteContainer}>
          <TextInput
            style={styles.noteInput}
            placeholder="Write your note here..."
            value={noteContent}
            onChangeText={setNoteContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.button, styles.sendButton]}
            onPress={handleSendNote}
            disabled={connectedRelays.length === 0}
          >
            <Text style={styles.buttonText}>
              {connectedRelays.length === 0 ? 'Connect to Relay First' : 'Send Note'}
            </Text>
          </TouchableOpacity>
        </View>

        {sendStatus ? (
          <Text style={[styles.message, sendStatus.includes('Failed') ? styles.error : styles.success]}>
            {sendStatus}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 20,
    color: '#1f2937',
  },
  inputContainer: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
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
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  relayListContainer: {
    marginBottom: 20,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  relayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 10,
  },
  relayUrl: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 24,
  },
  noteContainer: {
    marginBottom: 20,
  },
  noteInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 10,
  },
  sendButton: {
    marginTop: 0,
  },
});
