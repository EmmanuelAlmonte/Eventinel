/**
 * MenuScreen
 *
 * Main menu/dashboard with quick compose and navigation cards.
 * Uses RNE components with BRAND theme support.
 */

import { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Input, Card, Icon } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { useNDK, NDKEvent } from '@nostr-dev-kit/mobile';
import { isConnected } from '../lib/relay/status';

import { ScreenContainer } from '@components/ui';
import { useAppTheme } from '@hooks';

type MenuItem = {
  title: string;
  description: string;
  icon: string;
  iconType: string;
  screen: string;
  color: string;
};

const menuItems: MenuItem[] = [
  {
    title: 'Relays',
    description: 'Manage Nostr relay connections',
    icon: 'public',
    iconType: 'material',
    screen: 'Relays',
    color: '#3B82F6', // info blue
  },
  {
    title: 'Map',
    description: 'View incidents on map',
    icon: 'map',
    iconType: 'material',
    screen: 'Map',
    color: '#22C55E', // safe green
  },
  {
    title: 'Profile',
    description: 'Your profile and settings',
    icon: 'person',
    iconType: 'material',
    screen: 'Profile',
    color: '#F59E0B', // warning amber
  },
];

export default function MenuScreen() {
  const { ndk } = useNDK();
  const navigation = useNavigation<any>();
  const [noteContent, setNoteContent] = useState('');
  const [sendStatus, setSendStatus] = useState('');

  // Get theme-aware colors
  const { colors } = useAppTheme();

  const handleSendNote = async () => {
    if (!ndk) {
      setSendStatus('NDK not initialized');
      return;
    }
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
      // Create and publish note event (kind 1)
      // ndk.signer is set by auth system, publish() signs automatically
      const event = new NDKEvent(ndk);
      event.kind = 1;
      event.content = noteContent.trim();
      console.log('📤 [Note] Publishing note to', connectedCount, 'relay(s)...');

      // Optimistic publish - don't await (NDK handles retries)
      event.publish();

      console.log('✅ [Note] Note published');
      setSendStatus('Note published!');
      setNoteContent('');

      // Clear status after 3 seconds
      setTimeout(() => setSendStatus(''), 3000);
    } catch (error) {
      console.error('❌ [Note] Failed to send:', error);
      setSendStatus(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setSendStatus(''), 5000);
    }
  };

  // Determine status styling
  const isError = sendStatus.includes('Failed') || sendStatus.includes('Please');
  const statusColor = isError ? colors.error : colors.success;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenContainer scroll>
        {/* Header */}
        <View style={styles.header}>
          <Text h1 style={[styles.title, { color: colors.text }]}>Eventinel</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Nostr-native public safety monitoring
          </Text>
        </View>

        {/* Quick Compose Section */}
        <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Icon
              name="edit"
              type="material"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Compose</Text>
          </View>

          <Input
            placeholder="What's happening?"
            value={noteContent}
            onChangeText={setNoteContent}
            multiline
            numberOfLines={3}
            containerStyle={styles.inputContainer}
            inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
            inputStyle={[styles.inputText, { color: colors.text }]}
            placeholderTextColor={colors.textMuted}
          />

          <Button
            title="Publish Note"
            onPress={handleSendNote}
            containerStyle={styles.buttonContainer}
            icon={
              <Icon
                name="send"
                type="material"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
            }
          />

          {sendStatus ? (
            <View style={[
              styles.statusContainer,
              { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}40` }
            ]}>
              <Icon
                name={isError ? 'error-outline' : 'check-circle-outline'}
                type="material"
                size={18}
                color={statusColor}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>{sendStatus}</Text>
            </View>
          ) : null}
        </Card>

        {/* Navigation Grid */}
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <Card
              key={index}
              containerStyle={[
                styles.menuCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderLeftColor: item.color,
                  borderLeftWidth: 4,
                }
              ]}
              wrapperStyle={styles.menuCardWrapper}
            >
              <View style={styles.menuCardInner}>
                <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                  <Icon
                    name={item.icon}
                    type={item.iconType}
                    size={28}
                    color={item.color}
                  />
                </View>
                <View style={styles.menuCardContent}>
                  <Text style={[styles.menuCardTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.menuCardDescription, { color: colors.textMuted }]}>
                    {item.description}
                  </Text>
                </View>
                <Icon
                  name="chevron-right"
                  type="material"
                  size={24}
                  color={colors.textMuted}
                  onPress={() => navigation.navigate(item.screen)}
                  containerStyle={styles.chevronContainer}
                />
              </View>
            </Card>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Tap any card to get started
          </Text>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
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
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
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
    minHeight: 80,
  },
  inputText: {
    fontSize: 16,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    flex: 1,
  },
  grid: {
    gap: 12,
    marginBottom: 12,
  },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    margin: 0,
  },
  menuCardWrapper: {
    padding: 0,
  },
  menuCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuCardContent: {
    flex: 1,
  },
  menuCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuCardDescription: {
    fontSize: 14,
  },
  chevronContainer: {
    padding: 8,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
