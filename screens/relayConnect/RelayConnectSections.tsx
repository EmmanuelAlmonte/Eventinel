import { Pressable, View } from 'react-native';
import { Card, Icon, Input, Switch, Text } from '@rneui/themed';

import type { RelayInfo } from '../../types/relay';
import {
  formatRelayList,
  getRelayHealthMeta,
  getRelayKindLabel,
  getRelayPrimaryStatusLabel,
  getRelaySecondaryStatusLabel,
  getRelayThemeStatusColor,
  shouldShowRetryAction,
} from './helpers';
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

export function RelayHeader({ colors }: { colors: ThemeColors }) {
  return (
    <View style={styles.header}>
      <Text h2 style={[styles.title, { color: colors.text }]}>
        Relays
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Choose where Eventinel connects for reports and updates.
      </Text>
    </View>
  );
}

export function RelaySummarySection({
  colors,
  relays,
  connectedCount,
  message,
  isError,
}: {
  colors: ThemeColors;
  relays: RelayInfo[];
  connectedCount: number;
  message: string;
  isError: boolean;
}) {
  const { label, tone } = getRelayHealthMeta(relays);
  const toneColor = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.error;

  return (
    <View style={styles.summarySection}>
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.summaryHeader}>
          <Text style={[styles.summaryHeadline, { color: colors.text }]}>
            Connected {connectedCount} of {relays.length}
          </Text>
          <View style={[styles.healthChip, { borderColor: `${toneColor}55`, backgroundColor: `${toneColor}12` }]}>
            <View style={[styles.healthDot, { backgroundColor: toneColor }]} />
            <Text style={[styles.healthChipText, { color: toneColor }]}>{label}</Text>
          </View>
        </View>

        <Text style={[styles.summarySubtext, { color: colors.textMuted }]}>
          Healthy relays keep incident reports and nearby updates flowing reliably.
        </Text>
      </View>

      {message ? (
        <View
          style={[
            styles.messageContainer,
            { backgroundColor: `${(isError ? colors.error : colors.success)}15`, borderColor: `${(isError ? colors.error : colors.success)}40` },
          ]}
        >
          <Icon
            name={isError ? 'error-outline' : 'check-circle-outline'}
            type="material"
            size={18}
            color={isError ? colors.error : colors.success}
          />
          <Text style={[styles.messageText, { color: isError ? colors.error : colors.success }]}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

type RelayListSectionProps = {
  colors: ThemeColors;
  relays: RelayInfo[];
  canRemoveRelay: boolean;
  onReconnect: (rawUrl: string) => void;
  onDisconnect: (rawUrl: string) => void;
};

export function RelayListSection({
  colors,
  relays,
  canRemoveRelay,
  onReconnect,
  onDisconnect,
}: RelayListSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your relays</Text>
        <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
          Review which relays are active and retry or remove one safely when needed.
        </Text>
      </View>

      <Card containerStyle={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {relays.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="cloud-off" type="material" size={44} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No relays configured</Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              Add a relay below to start receiving reports and updates.
            </Text>
          </View>
        ) : (
          <View>
            {relays.map((relay, index) => {
              const statusColor = getRelayThemeStatusColor(relay.status, colors);
              const secondaryStatus = getRelaySecondaryStatusLabel(relay.status);
              const relayKind = getRelayKindLabel(relay.url);
              const canRetry = shouldShowRetryAction(relay.status);

              return (
                <View
                  key={relay.url}
                  style={[
                    styles.relayRow,
                    index > 0 && [styles.relayRowDivider, { borderTopColor: colors.border }],
                  ]}
                >
                  <View style={styles.relayContent}>
                    <Text style={[styles.relayUrl, { color: colors.text }]} numberOfLines={1} ellipsizeMode="middle">
                      {relay.url}
                    </Text>

                    <View style={styles.relayMetaRow}>
                      <View style={[styles.statusChip, { borderColor: `${statusColor}45`, backgroundColor: `${statusColor}12` }]}>
                        <View style={[styles.statusChipDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusChipText, { color: statusColor }]}>
                          {getRelayPrimaryStatusLabel(relay.status)}
                        </Text>
                      </View>

                      {secondaryStatus ? (
                        <Text style={[styles.secondaryMetaText, { color: colors.textMuted }]}>
                          {secondaryStatus}
                        </Text>
                      ) : null}
                    </View>

                    <Text style={[styles.relayKindText, { color: colors.textMuted }]}>{relayKind}</Text>
                  </View>

                  <View style={styles.relayActions}>
                    {canRetry ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Retry ${relay.url}`}
                        onPress={() => onReconnect(relay.url)}
                        style={({ pressed }) => [
                          styles.tertiaryAction,
                          { backgroundColor: colors.background, borderColor: `${colors.primary}40` },
                          pressed && styles.actionPressed,
                        ]}
                      >
                        <Text style={[styles.tertiaryActionText, { color: colors.primary }]}>Retry</Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${relay.url}`}
                      accessibilityState={{ disabled: !canRemoveRelay }}
                      disabled={!canRemoveRelay}
                      onPress={() => onDisconnect(relay.url)}
                      style={({ pressed }) => [
                        styles.inlineTextAction,
                        pressed && canRemoveRelay && styles.actionPressed,
                        !canRemoveRelay && styles.actionDisabled,
                      ]}
                    >
                      <Text style={[styles.inlineTextActionText, { color: canRemoveRelay ? colors.textMuted : colors.textMuted }]}>
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </View>
  );
}

type AddRelaySectionProps = {
  colors: ThemeColors;
  relayUrl: string;
  setRelayUrl: (value: string) => void;
  canAddRelay: boolean;
  onAddRelay: () => void;
};

export function AddRelaySection({
  colors,
  relayUrl,
  setRelayUrl,
  canAddRelay,
  onAddRelay,
}: AddRelaySectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Add relay</Text>
        <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
          Paste a relay URL to add it to this device and connect automatically.
        </Text>
      </View>

      <Card containerStyle={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAddRelay }}
          disabled={!canAddRelay}
          onPress={onAddRelay}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.primary },
            pressed && canAddRelay && styles.primaryButtonPressed,
            !canAddRelay && styles.primaryButtonDisabled,
          ]}
        >
          <Icon name="add" type="material" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Add relay</Text>
        </Pressable>
      </Card>
    </View>
  );
}

export function RelayInfoNote({ colors }: { colors: ThemeColors }) {
  return (
    <Text style={[styles.infoNote, { color: colors.textMuted }]}>
      Relay choices stay on this device and reconnect automatically.
    </Text>
  );
}

type DeveloperToolsSectionProps = {
  colors: ThemeColors;
  localRelays: string[];
  useLocalRelay: boolean;
  isSwitchingRelay: boolean;
  onToggle: (nextValue: boolean) => void;
};

export function DeveloperToolsSection({
  colors,
  localRelays,
  useLocalRelay,
  isSwitchingRelay,
  onToggle,
}: DeveloperToolsSectionProps) {
  if (!__DEV__) return null;

  return (
    <View style={styles.devSection}>
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Developer tools</Text>
        <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
          Non-production relay controls for local testing.
        </Text>
      </View>

      <Card containerStyle={[styles.devCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.devRow}>
          <View style={styles.devText}>
            <Text style={[styles.devTitle, { color: colors.text }]}>Use local dev relay</Text>
            <Text style={[styles.devDescription, { color: colors.textMuted }]}>
              Switch saved relays to {formatRelayList(localRelays)}.
            </Text>
          </View>
          <Switch value={useLocalRelay} onValueChange={onToggle} disabled={isSwitchingRelay} />
        </View>
      </Card>
    </View>
  );
}
