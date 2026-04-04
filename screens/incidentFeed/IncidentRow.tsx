import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Icon, Text } from '@rneui/themed';

import type { ProcessedIncident } from '@hooks';
import { SEVERITY_COLORS, TYPE_CONFIG } from '@lib/nostr/config';
import { formatRelativeTimeMs } from '@lib/utils/time';

import { incidentFeedStyles as styles } from './styles';

type IncidentRowProps = {
  incident: ProcessedIncident;
  colors: {
    surface: string;
    border: string;
    text: string;
    textMuted: string;
  };
  onPress: (incidentId: string) => void;
};

const SEVERITY_LABELS: Record<number, string> = {
  1: 'Info',
  2: 'Low',
  3: 'Medium',
  4: 'High',
  5: 'Critical',
};

function formatSourceLabel(source: string) {
  switch (source) {
    case 'opendataphilly':
      return 'Official data';
    case 'community':
      return 'Community';
    case 'radio':
      return 'Radio';
    default:
      return source.replace(/_/g, ' ');
  }
}

export const IncidentRow = memo(function IncidentRow({
  incident,
  colors,
  onPress,
}: IncidentRowProps) {
  const severityColor = SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS[1];
  const typeConfig = TYPE_CONFIG[incident.type] || TYPE_CONFIG.other;
  const sourceLabel = formatSourceLabel(incident.source);
  const secondaryLine =
    incident.description && incident.description !== incident.title
      ? incident.description
      : sourceLabel;

  return (
    <Pressable
      onPress={() => onPress(incident.incidentId)}
      style={({ pressed }) => [styles.incidentRow, pressed && styles.incidentRowPressed]}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${typeConfig.color}18` }]}>
        <Icon name={typeConfig.icon} type="material" size={18} color={typeConfig.color} />
      </View>

      <View style={[styles.cardContent, { borderBottomColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.kickerRow}>
            <Text style={[styles.typeLabel, { color: typeConfig.color }]}>{typeConfig.label}</Text>

            {incident.isVerified ? (
              <View style={[styles.supportPill, { backgroundColor: `${typeConfig.color}14` }]}>
                <Text style={[styles.supportPillText, { color: typeConfig.color }]}>Verified</Text>
              </View>
            ) : null}

            <View style={[styles.supportPill, { backgroundColor: colors.surface }]}>
              <Text style={[styles.supportPillText, { color: colors.textMuted }]}>{sourceLabel}</Text>
            </View>
          </View>

          <View
            style={[
              styles.severityBadge,
              {
                borderColor: `${severityColor}55`,
                backgroundColor: `${severityColor}14`,
              },
            ]}
          >
            <Text style={[styles.severityBadgeText, { color: severityColor }]}>
              {SEVERITY_LABELS[incident.severity]}
            </Text>
          </View>
        </View>

        <Text style={[styles.incidentTitle, { color: colors.text }]} numberOfLines={1}>
          {incident.title}
        </Text>

        <Text style={[styles.incidentDescription, { color: colors.textMuted }]} numberOfLines={2}>
          {secondaryLine}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="schedule" type="material" size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
              {formatRelativeTimeMs(incident.occurredAtMs)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="location-on" type="material" size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
              {incident.location.address}
            </Text>
          </View>
          <Icon name="chevron-right" type="material" size={24} color={colors.textMuted} />
        </View>
      </View>
    </Pressable>
  );
});
