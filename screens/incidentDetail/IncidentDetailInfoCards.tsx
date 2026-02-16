import { StyleSheet, View } from 'react-native';
import { Card, Icon, Text } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';

import { formatRelativeTime } from '@lib/utils/time';
import type { ProcessedIncident } from '@hooks/useIncidentSubscription';

type TypeConfig = {
  color: string;
  gradient: [string, string, ...string[]];
  icon: string;
};

type ThemeColors = {
  border: string;
  success: string;
  surface: string;
  text: string;
  textMuted: string;
  warning: string;
};

type IncidentDetailInfoCardsProps = {
  incident: ProcessedIncident;
  colors: ThemeColors;
  typeConfig: TypeConfig;
  severityColor: string;
};

export function IncidentDetailInfoCards({
  incident,
  colors,
  typeConfig,
  severityColor,
}: IncidentDetailInfoCardsProps) {
  return (
    <>
      <View style={styles.section}>
        <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.incidentHeader}>
            <LinearGradient
              colors={typeConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Icon name={typeConfig.icon} type="material" size={32} color="#FFFFFF" />
            </LinearGradient>

            <View style={styles.incidentInfo}>
              <View style={styles.badgeRow}>
                <Text style={[styles.typeBadge, { color: typeConfig.color }]}>
                  {incident.type.replace('_', ' ').toUpperCase()}
                </Text>
                {incident.isVerified ? (
                  <View style={[styles.verifiedBadge, { backgroundColor: `${colors.success}20` }]}>
                    <Icon name="verified" type="material" size={12} color={colors.success} />
                    <Text style={[styles.verifiedText, { color: colors.success }]}>VERIFIED</Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.incidentTitle, { color: colors.text }]}>{incident.title}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Icon name="schedule" type="material" size={14} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {formatRelativeTime(incident.occurredAt)}
                  </Text>
                </View>
                <View style={[styles.severityPill, { backgroundColor: severityColor }]}>
                  <Text style={styles.severityText}>Severity {incident.severity}</Text>
                </View>
              </View>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.locationRow}>
            <View style={[styles.locationIcon, { backgroundColor: `${typeConfig.color}20` }]}>
              <Icon name="location-on" type="material" size={20} color={typeConfig.color} />
            </View>
            <View style={styles.locationContent}>
              <Text style={[styles.locationLabel, { color: colors.textMuted }]}>Location</Text>
              <Text style={[styles.locationAddress, { color: colors.text }]}>{incident.location.address}</Text>
              {incident.location.city ? (
                <Text style={[styles.locationCity, { color: colors.textMuted }]}>
                  {incident.location.city}{incident.location.state ? `, ${incident.location.state}` : ''}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Icon name="info-outline" type="material" size={18} color={colors.warning} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Incident Details</Text>
          </View>
          <Text style={[styles.description, { color: colors.text }]}>{incident.description}</Text>
        </Card>
      </View>

      <View style={styles.sourceRow}>
        <View style={[styles.sourceDot, { backgroundColor: colors.textMuted }]} />
        <Text style={[styles.sourceText, { color: colors.textMuted }]}>Source: {incident.source}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    margin: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  incidentHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  incidentTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationCity: {
    fontSize: 14,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sourceDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  sourceText: {
    fontSize: 11,
  },
});
