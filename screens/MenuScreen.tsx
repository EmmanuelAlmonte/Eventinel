import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ndk } from '../lib/ndk';
import { NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/mobile';
import { isConnected, getStatusString } from '../lib/relay/status';

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

type MenuItem = {
  title: string;
  description: string;
  icon: string;
  screen: string;
  color: string;
};

const menuItems: MenuItem[] = [
  {
    title: 'Relays',
    description: 'Manage Nostr relay connections',
    icon: '🌐',
    screen: 'Relays',
    color: '#3b82f6',
  },
  {
    title: 'Private Key',
    description: 'Set your Nostr identity',
    icon: '🔑',
    screen: 'Key',
    color: '#8b5cf6',
  },
  {
    title: 'Map',
    description: 'View incidents on map',
    icon: '🗺️',
    screen: 'Map',
    color: '#10b981',
  },
  {
    title: 'Profile',
    description: 'Your profile and settings',
    icon: '👤',
    screen: 'Profile',
    color: '#f59e0b',
  },
];

export default function MenuScreen() {
  const navigation = useNavigation<any>();
  const [noteContent, setNoteContent] = useState('');
  const [sendStatus, setSendStatus] = useState('');

  const handleSendNote = async () => {
    if (!noteContent.trim()) {
      setSendStatus('Please enter a note');
      return;
    }

    // Check connected relays
    const poolRelays = Array.from(ndk.pool.relays.values());
    const connectedRelays = poolRelays.filter(relay => isConnected(relay.status));
    const connectedCount = connectedRelays.length;

    console.log('📝 [Note] User sending note, content length:', noteContent.trim().length);
    console.log('🔌 [Note] Connected relays:', connectedCount, connectedRelays.map(r => r.url));

    if (connectedCount === 0) {
      console.warn('⚠️ [Note] No connected relays, cannot publish');
      setSendStatus('Please connect to at least one relay first');
      setTimeout(() => setSendStatus(''), 3000);
      return;
    }

    try {
      // Get or create a signer for this session
      console.log('🔑 [Note] Getting signer...');
      const signer = getSessionSigner();
      console.log('✅ [Note] Signer ready');

      // Create a new note event (kind 1)
      const event = new NDKEvent(ndk);
      event.kind = 1;
      event.content = noteContent.trim();
      console.log('📄 [Note] Created event, kind:', event.kind);

      // Sign and publish to all connected relays
      console.log('✍️ [Note] Signing event...');
      await event.sign();
      console.log('✅ [Note] Event signed, id:', event.id);

      console.log('📤 [Note] Publishing to', connectedCount, 'relay(s)...');
      const relaySet = await event.publish();

      const published = relaySet.size;
      console.log('✅ [Note] Published to', published, 'relay(s):', Array.from(relaySet).map(r => r.url));
      setSendStatus(`✓ Published to ${published} relay(s)!`);
      setNoteContent('');

      // Clear status after 3 seconds
      setTimeout(() => setSendStatus(''), 3000);
    } catch (error) {
      console.error('❌ [Note] Failed to send:', error);
      setSendStatus(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setSendStatus(''), 5000);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Eventinel</Text>
          <Text style={styles.subtitle}>Nostr-native public safety monitoring</Text>
        </View>

        {/* Quick Compose Section */}
        <View style={styles.composeSection}>
          <Text style={styles.sectionTitle}>✍️ Quick Compose</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="What's happening?"
            value={noteContent}
            onChangeText={setNoteContent}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={styles.publishButton}
            onPress={handleSendNote}
          >
            <Text style={styles.publishButtonText}>Publish Note</Text>
          </TouchableOpacity>
          {sendStatus ? (
            <Text style={[
              styles.statusText,
              sendStatus.includes('Failed') || sendStatus.includes('Please') ? styles.statusError : styles.statusSuccess
            ]}>
              {sendStatus}
            </Text>
          ) : null}
        </View>

        <View style={styles.grid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.card, { borderLeftColor: item.color }]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Tap any card to get started</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  grid: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 40,
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  arrow: {
    fontSize: 32,
    color: '#d1d5db',
    fontWeight: '300',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  composeSection: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  noteInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 12,
  },
  publishButton: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  statusSuccess: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusError: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
});
