import { StyleSheet, View } from 'react-native';
import { Icon, Text } from '@rneui/themed';

import { formatRelativeTime } from '@lib/utils/time';
import type { ProcessedIncident } from '@hooks/useIncidentSubscription';

type ThemeColors = {
  border: string;
  primary: string;
  success: string;
  surface: string;
  text: string;
  textMuted: string;
};

type IncidentDetailUpdatesSectionProps = {
  incident: ProcessedIncident;
  colors: ThemeColors;
};

export function IncidentDetailUpdatesSection({
  incident,
  colors,
}: IncidentDetailUpdatesSectionProps) {
  const sourceLabel = incident.source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const trustLabel = incident.isVerified ? 'Verified source' : 'Community report';

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Updates</Text>

      <View
        style={[
          styles.updatesSurface,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.statusRow}>
          <View style={[styles.statusIcon, { backgroundColor: `${colors.primary}18` }]}>
            <Icon name="history" type="material" size={18} color={colors.primary} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>No follow-up updates yet</Text>
          </View>
        </View>

        <View style={[styles.factsList, { borderTopColor: colors.border }]}>
          <View style={styles.factRow}>
            <Text style={[styles.factLabel, { color: colors.textMuted }]}>Initial report</Text>
            <Text style={[styles.factValue, { color: colors.text }]}>From {sourceLabel}</Text>
          </View>
          <View style={styles.factRow}>
            <Text style={[styles.factLabel, { color: colors.textMuted }]}>Reported</Text>
            <Text style={[styles.factValue, { color: colors.text }]}>
              {formatRelativeTime(incident.occurredAt)}
            </Text>
          </View>
          <View style={styles.factRow}>
            <Text style={[styles.factLabel, { color: colors.textMuted }]}>Trust</Text>
            <Text style={[styles.factValue, { color: colors.text }]}>{trustLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },
  updatesSurface: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 14,
  },
  statusIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCopy: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  factsList: {
    marginTop: 16,
    paddingTop: 14,
    gap: 10,
    borderTopWidth: 1,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  factLabel: {
    fontSize: 13,
  },
  factValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
  },
});
