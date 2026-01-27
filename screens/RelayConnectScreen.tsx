/**
 * RelayConnectScreen
 *
 * Manage Nostr relay connections with add/remove functionality.
 * Uses RNE components with BRAND theme support.
 */

import { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, Pressable } from 'react-native';
import { Text, Button, Input, Card, Icon } from '@rneui/themed';
import { ndk } from '../lib/ndk';
import { NDKRelayStatus } from '@nostr-dev-kit/mobile';
import { isConnected, getStatusString } from '../lib/relay/status';
import { addRelayToStorage, removeRelayFromStorage } from '../lib/relay/storage';
import type { RelayInfo } from '../types/relay';

import { ScreenContainer } from '@components/ui';
import { useAppTheme } from '@hooks';

// Map status to semantic colors
function getStatusColor(status: string, colors: ReturnType<typeof useAppTheme>['colors']): string {
  switch (status.toLowerCase()) {
    case 'connected':
      return colors.success;
    case 'connecting':
      return colors.warning;
    case 'disconnected':
    case 'disconnecting':
      return colors.error;
    default:
      return colors.textMuted;
  }
}

export default function RelayConnectScreen() {
  const [relayUrl, setRelayUrl] = useState('');
  const [relays, setRelays] = useState<RelayInfo[]>([]);
  const [message, setMessage] = useState('');

  // Get theme-aware colors
  const { colors } = useAppTheme();

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
    console.log('[Relay] User adding relay:', url);
    setMessage(`Connecting to ${url}...`);

    try {
      // Add relay to NDK pool
      console.log('[Relay] Adding to NDK pool:', url);
      const relay = ndk.addExplicitRelay(url);

      // Save to persistent storage immediately
      console.log('[Relay] Saving to storage:', url);
      await addRelayToStorage(url);

      // Attempt connection
      console.log('[Relay] Initiating connection:', url);
      relay.connect();

      // Wait a moment to check actual status
      setTimeout(() => {
        const poolRelay = ndk.pool.relays.get(url);
        if (poolRelay && isConnected(poolRelay.status)) {
          console.log('[Relay] Connection successful:', url, 'status:', poolRelay.status);
          setMessage(`Connected to ${url}`);
        } else if (poolRelay) {
          const status = getStatusString(poolRelay.status);
          console.warn('[Relay] Connection not established:', url, 'status:', status, 'rawStatus:', poolRelay.status);
          setMessage(`Added ${url} (${status})`);
        } else {
          console.warn('[Relay] Relay not in pool:', url);
          setMessage(`Added ${url} - attempting connection...`);
        }
      }, 2000);

      setRelayUrl('');

      // UI updates automatically via event listeners
    } catch (error) {
      console.error('[Relay] Failed to add relay:', url, error);
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
              console.log('[Relay] User removing relay:', url);

              // Remove from NDK pool
              console.log('[Relay] Removing from NDK pool:', url);
              ndk.pool.removeRelay(url);

              // Remove from persistent storage
              console.log('[Relay] Removing from storage:', url);
              await removeRelayFromStorage(url);

              console.log('[Relay] Successfully removed:', url);
              setMessage(`Removed ${url}`);

              // UI updates automatically via event listeners
            } catch (error) {
              console.error('[Relay] Failed to remove:', url, error);
              setMessage(`Failed to remove: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          },
        },
      ]
    );
  };

  // Count connected relays
  const connectedCount = relays.filter(r => r.isConnected).length;

  // Determine message styling
  const isError = message.includes('Failed') || message.includes('must start');
  const messageColor = isError ? colors.error : colors.success;

  // DEV-only: Log relay info and check for duplicates
  if (__DEV__) {
    console.log('[RelayScreen] Rendering with', relays.length, 'relays');
    const urls = relays.map(r => r.url);
    const uniqueUrls = new Set(urls);
    if (urls.length !== uniqueUrls.size) {
      console.error('[RelayScreen] ⚠️ DUPLICATE RELAY URLS DETECTED!');
      console.error('[RelayScreen] Duplicates:', urls.filter((url, i) => urls.indexOf(url) !== i));
    }
  }

  return (
    <ScreenContainer scroll>
      {/* Header */}
      <View style={styles.header}>
        <Text h2 style={[styles.title, { color: colors.text }]}>Relay Management</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {relays.length} relays - {connectedCount} connected
        </Text>
      </View>

      {/* Add Relay Card */}
      <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Icon
            name="add-circle-outline"
            type="material"
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Add New Relay</Text>
        </View>

        <Input
          placeholder="wss://relay.example.com"
          value={relayUrl}
          onChangeText={setRelayUrl}
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon={
            <Icon
              name="link"
              type="material"
              size={20}
              color={colors.textMuted}
            />
          }
          containerStyle={styles.inputContainer}
          inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
          inputStyle={[styles.inputText, { color: colors.text }]}
          placeholderTextColor={colors.textMuted}
        />

        <Button
          title="Connect"
          onPress={handleConnect}
          containerStyle={styles.buttonContainer}
          icon={
            <Icon
              name="wifi"
              type="material"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
          }
        />
      </Card>

      {/* Status Message */}
      {message ? (
        <View style={[
          styles.messageContainer,
          { backgroundColor: `${messageColor}15`, borderColor: `${messageColor}40` }
        ]}>
          <Icon
            name={isError ? 'error-outline' : 'check-circle-outline'}
            type="material"
            size={18}
            color={messageColor}
          />
          <Text style={[styles.messageText, { color: messageColor }]}>{message}</Text>
        </View>
      ) : null}

      {/* Relay List */}
      <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Icon
            name="dns"
            type="material"
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Connected Relays</Text>
        </View>

        {relays.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              name="cloud-off"
              type="material"
              size={48}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No relays added</Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              Add a relay URL above to get started
            </Text>
          </View>
        ) : (
          <View style={styles.relayList}>
            {relays.map((relay) => {
              const statusColor = getStatusColor(relay.status, colors);
              return (
                <View
                  key={relay.url}
                  style={[
                    styles.relayItem,
                    { backgroundColor: colors.background, borderColor: colors.border }
                  ]}
                >
                  {/* Left: dot + text */}
                  <View style={styles.relayLeft}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <View style={styles.relayContent}>
                      <Text
                        style={[styles.relayUrl, { color: colors.text }]}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {relay.url}
                      </Text>
                      <Text style={[styles.relayStatus, { color: statusColor }]}>
                        {relay.status}
                      </Text>
                    </View>
                  </View>

                  {/* Right: remove button */}
                  <Pressable
                    onPress={() => handleDisconnect(relay.url)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.removeButton,
                      { backgroundColor: `${colors.error}15` },
                      pressed && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Disconnect ${relay.url}`}
                  >
                    <Icon name="close" type="material" size={18} color={colors.error} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* Info Note */}
      <View style={[styles.infoContainer, { borderColor: `${colors.info}30` }]}>
        <Icon
          name="info-outline"
          type="material"
          size={18}
          color={colors.info}
        />
        <Text style={[styles.infoText, { color: colors.info }]}>
          Relays are saved locally and will reconnect automatically when the app restarts.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
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
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
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
  },
  buttonContainer: {
    marginTop: 4,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  messageText: {
    fontSize: 14,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 14,
  },
  relayList: {
    gap: 10,
  },
  relayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  relayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 10,
  },
  relayContent: {
    flex: 1,
    minWidth: 0,
  },
  relayUrl: {
    fontSize: 14,
    fontWeight: '600',
  },
  relayStatus: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
