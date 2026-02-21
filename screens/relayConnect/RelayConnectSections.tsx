import { Pressable, View } from 'react-native';
import { Button, Card, Icon, Input, Switch, Text } from '@rneui/themed';

import { isConnecting } from '@lib/relay/status';
import type { RelayInfo } from '../../types/relay';

import { formatRelayList, getStatusColor } from './helpers';
import { relayConnectStyles as styles } from './styles';

type ThemeColors = {
  background: string;
  border: string;
  error: string;
  info: string;
  primary: string;
  success: string;
  surface: string;
  text: string;
  textMuted: string;
  warning: string;
};

export function RelayHeader({
  colors,
  relayCount,
  connectedCount,
}: {
  colors: ThemeColors;
  relayCount: number;
  connectedCount: number;
}) {
  return (
    <View style={styles.header}>
      <Text h2 style={[styles.title, { color: colors.text }]}>Relay Management</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {relayCount} relays - {connectedCount} connected
      </Text>
    </View>
  );
}

type AddRelayCardProps = {
  colors: ThemeColors;
  relayUrl: string;
  setRelayUrl: (value: string) => void;
  onConnect: () => void;
};

export function AddRelayCard({
  colors,
  relayUrl,
  setRelayUrl,
  onConnect,
}: AddRelayCardProps) {
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="add-circle-outline" type="material" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Add New Relay</Text>
      </View>

      <Input
        placeholder="wss://relay.example.com"
        value={relayUrl}
        onChangeText={setRelayUrl}
        autoCapitalize="none"
        autoCorrect={false}
        leftIcon={<Icon name="link" type="material" size={20} color={colors.textMuted} />}
        containerStyle={styles.inputContainer}
        inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
        inputStyle={[styles.inputText, { color: colors.text }]}
        placeholderTextColor={colors.textMuted}
      />

      <Button
        title="Connect"
        onPress={onConnect}
        containerStyle={styles.buttonContainer}
        icon={<Icon name="wifi" type="material" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
      />
    </Card>
  );
}

type DevRelayToggleCardProps = {
  colors: ThemeColors;
  localRelays: string[];
  useLocalRelay: boolean;
  isSwitchingRelay: boolean;
  onToggle: (nextValue: boolean) => void;
};

export function DevRelayToggleCard({
  colors,
  localRelays,
  useLocalRelay,
  isSwitchingRelay,
  onToggle,
}: DevRelayToggleCardProps) {
  if (!__DEV__) return null;

  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="build" type="material" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Dev Relay</Text>
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleText}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>Use local relay</Text>
          <Text style={[styles.toggleDescription, { color: colors.textMuted }]}>
            Switches saved relays to {formatRelayList(localRelays)}.
          </Text>
        </View>
        <Switch value={useLocalRelay} onValueChange={onToggle} disabled={isSwitchingRelay} />
      </View>

      <Text style={[styles.toggleNote, { color: colors.textMuted }]}>
        Turning this off restores the default relay list.
      </Text>
    </Card>
  );
}

export function RelayMessageBanner({
  colors,
  message,
  isError,
}: {
  colors: ThemeColors;
  message: string;
  isError: boolean;
}) {
  if (!message) return null;
  const messageColor = isError ? colors.error : colors.success;

  return (
    <View
      style={[
        styles.messageContainer,
        { backgroundColor: `${messageColor}15`, borderColor: `${messageColor}40` },
      ]}
    >
      <Icon
        name={isError ? 'error-outline' : 'check-circle-outline'}
        type="material"
        size={18}
        color={messageColor}
      />
      <Text style={[styles.messageText, { color: messageColor }]}>{message}</Text>
    </View>
  );
}

type RelayListCardProps = {
  colors: ThemeColors;
  relays: RelayInfo[];
  onReconnect: (rawUrl: string) => void;
  onDisconnect: (rawUrl: string) => void;
};

export function RelayListCard({
  colors,
  relays,
  onReconnect,
  onDisconnect,
}: RelayListCardProps) {
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="dns" type="material" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Connected Relays</Text>
      </View>

      {relays.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="cloud-off" type="material" size={48} color={colors.textMuted} />
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
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
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
                    <Text style={[styles.relayStatus, { color: statusColor }]}>{relay.status}</Text>
                  </View>
                </View>

                <View style={styles.relayActions}>
                  <Pressable
                    onPress={() => onReconnect(relay.url)}
                    hitSlop={10}
                    disabled={isConnecting(relay.rawStatus)}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: `${colors.primary}15` },
                      (pressed || isConnecting(relay.rawStatus)) && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Reconnect ${relay.url}`}
                  >
                    <Icon name="refresh" type="material" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => onDisconnect(relay.url)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: `${colors.error}15` },
                      pressed && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Disconnect ${relay.url}`}
                  >
                    <Icon name="close" type="material" size={18} color={colors.error} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

export function RelayInfoNote({ colors }: { colors: ThemeColors }) {
  return (
    <View style={[styles.infoContainer, { borderColor: `${colors.info}30` }]}>
      <Icon name="info-outline" type="material" size={18} color={colors.info} />
      <Text style={[styles.infoText, { color: colors.info }]}>
        Relays are saved locally and will reconnect automatically when the app restarts.
      </Text>
    </View>
  );
}
