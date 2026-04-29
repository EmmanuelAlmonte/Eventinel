import React from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Button, Icon, Text } from '@rneui/themed';

import type { ProcessedIncident } from '@hooks';

import { ESTIMATED_ITEM_SIZE } from './constants';
import { IncidentFeedEmpty } from './IncidentFeedEmpty';
import type { RelayBannerStatus } from './helpers';
import { incidentFeedStyles as styles } from './styles';

type IncidentFeedContentProps = {
  colors: {
    border: string;
    primary: string;
    surface: string;
    text: string;
    textMuted: string;
    success: string;
  };
  visibleIncidents: ProcessedIncident[];
  hasReceivedHistory: boolean;
  relayStatus: RelayBannerStatus;
  hasRelays: boolean;
  onRelaySettings: () => void;
  renderIncidentItem: ({ item }: { item: ProcessedIncident }) => React.ReactElement;
};

export function IncidentFeedContent({
  colors,
  visibleIncidents,
  hasReceivedHistory,
  relayStatus,
  hasRelays,
  onRelaySettings,
  renderIncidentItem,
}: IncidentFeedContentProps) {
  const showRelayBanner = !!relayStatus && visibleIncidents.length > 0;
  const statusLabel = hasReceivedHistory ? 'Updated just now' : 'Updating now';
  const subtitle = 'Recent incidents and community reports around your current area.';

  return (
    <>
      <View style={styles.header}>
        <Text h2 style={[styles.title, { color: colors.text }]}>Incidents</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>

        <View style={styles.headerMetaRow}>
          <View
            style={[
              styles.summaryPill,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {visibleIncidents.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>nearby</Text>
          </View>

          <Text style={[styles.headerStatus, { color: colors.textMuted }]}>{statusLabel}</Text>
        </View>
      </View>

      {showRelayBanner && relayStatus && (
        <View
          style={[
            styles.relayBanner,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.relayBannerContent}>
            <View style={styles.relayBannerHeader}>
              <Icon name={relayStatus.icon} type="material" size={18} color={colors.textMuted} />
              <Text style={[styles.relayBannerTitle, { color: colors.text }]}>
                {relayStatus.title}
              </Text>
            </View>
            <Text style={[styles.relayBannerDescription, { color: colors.textMuted }]}>
              {relayStatus.description}
            </Text>
          </View>
          <Button
            title={relayStatus.actionLabel}
            onPress={onRelaySettings}
            type="clear"
            containerStyle={styles.relayBannerActionContainer}
            titleStyle={[styles.relayBannerActionText, { color: colors.primary }]}
          />
        </View>
      )}

      <FlashList
        data={visibleIncidents}
        keyExtractor={(item) => item.incidentId}
        renderItem={renderIncidentItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={ESTIMATED_ITEM_SIZE}
        refreshing={false}
        onRefresh={() => {}}
        ListEmptyComponent={
          <IncidentFeedEmpty
            relayStatus={relayStatus}
            hasRelays={hasRelays}
            hasReceivedHistory={hasReceivedHistory}
            onRelaySettings={onRelaySettings}
            colors={colors}
          />
        }
      />
    </>
  );
}
