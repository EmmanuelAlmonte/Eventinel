import React from 'react';
import { View } from 'react-native';
import { Icon, Text } from '@rneui/themed';

import { EmptyState, NoRelaysEmpty } from '@components/ui';

import type { RelayBannerStatus } from './helpers';
import { incidentFeedStyles as styles } from './styles';

type IncidentFeedEmptyProps = {
  relayStatus: RelayBannerStatus;
  hasRelays: boolean;
  hasReceivedHistory: boolean;
  onRelaySettings: () => void;
  colors: {
    success: string;
    text: string;
    textMuted: string;
  };
};

export function IncidentFeedEmpty({
  relayStatus,
  hasRelays,
  hasReceivedHistory,
  onRelaySettings,
  colors,
}: IncidentFeedEmptyProps) {
  if (relayStatus) {
    if (!hasRelays) {
      return <NoRelaysEmpty onAddRelay={onRelaySettings} />;
    }

    return (
      <EmptyState
        icon={relayStatus.icon}
        title={relayStatus.title}
        description={relayStatus.description}
        action={relayStatus.actionLabel}
        onAction={onRelaySettings}
      />
    );
  }

  if (hasReceivedHistory) {
    return (
      <View style={styles.emptyState}>
        <Icon name="check-circle" type="material" size={64} color={colors.success} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Quiet right now</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          No nearby incidents have been reported in your current area.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.emptyState}>
      <Icon name="hourglass-empty" type="material" size={64} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Checking nearby activity</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        Pulling the latest incident reports from your relays.
      </Text>
    </View>
  );
}
