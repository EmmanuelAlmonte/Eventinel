import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Card, Icon, Text } from '@rneui/themed';

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

export const IncidentRow = memo(function IncidentRow({
  incident,
  colors,
  onPress,
}: IncidentRowProps) {
  const severityColor = SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS[1];
  const typeConfig = TYPE_CONFIG[incident.type] || TYPE_CONFIG.other;

  return (
    <Pressable onPress={() => onPress(incident.incidentId)}>
      <Card
        containerStyle={[
          styles.incidentCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderLeftColor: severityColor,
            borderLeftWidth: 4,
          },
        ]}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconContainer, { backgroundColor: `${typeConfig.color}20` }]}>
            <Icon name={typeConfig.icon} type="material" size={24} color={typeConfig.color} />
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={[styles.incidentTitle, { color: colors.text }]} numberOfLines={1}>
                {incident.title}
              </Text>
              <Badge
                value={`Sev ${incident.severity}`}
                badgeStyle={{ backgroundColor: severityColor }}
                textStyle={styles.badgeText}
              />
            </View>

            <Text style={[styles.incidentDescription, { color: colors.textMuted }]} numberOfLines={2}>
              {incident.description}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Icon name="schedule" type="material" size={14} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  {formatRelativeTimeMs(incident.occurredAtMs)}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="location-on" type="material" size={14} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                  {incident.location.address}
                </Text>
              </View>
            </View>
          </View>

          <Icon name="chevron-right" type="material" size={24} color={colors.textMuted} />
        </View>
      </Card>
    </Pressable>
  );
});
