import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ndk } from '../lib/ndk';
import { NDKRelayStatus } from '@nostr-dev-kit/ndk-mobile';
import { isConnected, getStatusString, getStatusColor } from '../lib/relay/status';
import { addRelayToStorage, removeRelayFromStorage } from '../lib/relay/storage';
import type { RelayInfo } from '../types/relay';

export default function RelayConnectScreen() {
  const [relayUrl, setRelayUrl] = useState('');
  const [relays, setRelays] = useState<RelayInfo[]>([]);
  const [message, setMessage] = useState('');

  // Update relay list from NDK pool
  const updateRelays = () => {
    const poolRelays = Array.from(ndk.pool.relays.values());
    const relayInfos: RelayInfo[] = poolRelays.map(relay => ({
      url: relay.url,
      status: getStatusString(relay.status),
      rawStatus: relay.status,
      isConnected: isConnected(relay.status),
    }));
    setRelays(relayInfos);
  };

  useEffect(() => {
    // Initial load
    updateRelays();

    // Event-based updates (no polling!)
    const handleConnect = () => updateRelays();
    const handleDisconnect = () => updateRelays();
    const handleConnecting = () => updateRelays();

    ndk.pool.on('relay:connect', handleConnect);
    ndk.pool.on('relay:disconnect', handleDisconnect);
    ndk.pool.on('relay:connecting', handleConnecting);

    return () => {
      ndk.pool.off('relay:connect', handleConnect);
      ndk.pool.off('relay:disconnect', handleDisconnect);
      ndk.pool.off('relay:connecting', handleConnecting);
    };
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

    const url = relayUrl.trim();
    console.log('🔌 [Relay] User adding relay:', url);
    setMessage(`Connecting to ${url}...`);

    try {
      // Add relay to NDK pool
      console.log('➕ [Relay] Adding to NDK pool:', url);
      const relay = ndk.addExplicitRelay(url);

      // Save to persistent storage immediately
      console.log('💾 [Relay] Saving to storage:', url);
      await addRelayToStorage(url);

      // Attempt connection
      console.log('🔄 [Relay] Initiating connection:', url);
      relay.connect();

      // Wait a moment to check actual status
      setTimeout(() => {
        const poolRelay = ndk.pool.relays.get(url);
        if (poolRelay && isConnected(poolRelay.status)) {
          console.log('✅ [Relay] Connection successful:', url, 'status:', poolRelay.status);
          setMessage(`✓ Connected to ${url}`);
        } else if (poolRelay) {
          const status = getStatusString(poolRelay.status);
          console.warn('⚠️ [Relay] Connection not established:', url, 'status:', status, 'rawStatus:', poolRelay.status);
          setMessage(`⚠️ Added ${url} (${status})`);
        } else {
          console.warn('⚠️ [Relay] Relay not in pool:', url);
          setMessage(`Added ${url} - attempting connection...`);
        }
      }, 2000);

      setRelayUrl('');

      // UI updates automatically via event listeners
    } catch (error) {
      console.error('❌ [Relay] Failed to add relay:', url, error);
      setMessage(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDisconnect = async (url: string) => {
    Alert.alert(
      'Disconnect Relay',
      `Remove ${url}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ [Relay] User removing relay:', url);

              // Remove from NDK pool
              console.log('➖ [Relay] Removing from NDK pool:', url);
              ndk.pool.removeRelay(url);

              // Remove from persistent storage
              console.log('💾 [Relay] Removing from storage:', url);
              await removeRelayFromStorage(url);

              console.log('✅ [Relay] Successfully removed:', url);
              setMessage(`Removed ${url}`);

              // UI updates automatically via event listeners
            } catch (error) {
              console.error('❌ [Relay] Failed to remove:', url, error);
              setMessage(`Failed to remove: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          },
        },
      ]
    );
  };


  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Relay Management</Text>

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

        <Text style={styles.subtitle}>
          Relays ({relays.length}) - {relays.filter(r => r.isConnected).length} connected
        </Text>
        <View style={styles.relayListContainer}>
          {relays.length === 0 ? (
            <Text style={styles.emptyText}>No relays added</Text>
          ) : (
            relays.map((relay, index) => (
              <View key={index} style={styles.relayItem}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(relay.status) }
                  ]}
                />
                <View style={styles.relayInfo}>
                  <Text style={styles.relayUrl}>{relay.url}</Text>
                  <Text style={styles.relayStatus}>{relay.status}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleDisconnect(relay.url)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
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
  relayInfo: {
    flex: 1,
    marginRight: 8,
  },
  relayUrl: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 2,
  },
  relayStatus: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
