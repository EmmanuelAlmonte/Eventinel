import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import { Divider, Icon, Text } from '@rneui/themed';

import { formatRelativeTime } from '@lib/utils/time';
import type { ProcessedIncident } from '@hooks/useIncidentSubscription';

type TypeConfig = {
  color: string;
  label: string;
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
  typeIconSource: ImageSourcePropType;
  severityColor: string;
};

export function IncidentDetailInfoCards({
  incident,
  colors,
  typeConfig,
  typeIconSource,
  severityColor,
}: IncidentDetailInfoCardsProps) {
  const sourceLabel = incident.source.replace(/_/g, ' ');

  return (
    <>
      <View style={styles.section}>
        <View
          style={[
            styles.heroSurface,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.badgeRow}>
            <Text style={[styles.typeBadge, { color: typeConfig.color }]}>{typeConfig.label}</Text>

            <View style={[styles.metaPill, { backgroundColor: `${severityColor}16` }]}>
              <Text style={[styles.metaPillText, { color: severityColor }]}>
                Severity {incident.severity}
              </Text>
            </View>

            {incident.isVerified ? (
              <View style={[styles.metaPill, { backgroundColor: `${colors.success}16` }]}>
                <Icon name="verified" type="material" size={12} color={colors.success} />
                <Text style={[styles.metaPillText, { color: colors.success }]}>Verified</Text>
              </View>
            ) : null}

            <View style={[styles.metaPill, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              <Text style={[styles.metaPillText, { color: colors.textMuted }]}>
                {sourceLabel}
              </Text>
            </View>
          </View>

          <View style={styles.incidentHeader}>
            <View style={[styles.iconFrame, { backgroundColor: `${typeConfig.color}18` }]}>
              <Image
                source={typeIconSource}
                style={[styles.typeIconImage, { tintColor: severityColor }]}
                resizeMode="contain"
              />
            </View>

            <View style={styles.incidentInfo}>
              <Text style={[styles.incidentTitle, { color: colors.text }]}>{incident.title}</Text>
              <Text style={[styles.description, { color: colors.textMuted }]}>
                {incident.description}
              </Text>
              <View style={styles.metaLine}>
                <View style={styles.metaItem}>
                  <Icon name="schedule" type="material" size={14} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {formatRelativeTime(incident.occurredAt)}
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
          </View>

          <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailsGrid}>
            <View style={styles.detailBlock}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Where</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {incident.location.address}
              </Text>
              {incident.location.city ? (
                <Text style={[styles.detailSupporting, { color: colors.textMuted }]}>
                  {incident.location.city}
                  {incident.location.state ? `, ${incident.location.state}` : ''}
                </Text>
              ) : null}
            </View>

            <View style={styles.detailBlock}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Report source</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{sourceLabel}</Text>
              <Text style={[styles.detailSupporting, { color: colors.textMuted }]}>
                {incident.isVerified ? 'Verified report' : 'Community report'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionEyebrow, { color: colors.warning }]}>Map preview</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Reported location</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  heroSurface: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  incidentHeader: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
  },
  iconFrame: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconImage: {
    width: 36,
    height: 36,
  },
  incidentInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  incidentTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 32,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 13,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  divider: {
    marginTop: 18,
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  detailBlock: {
    flex: 1,
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailSupporting: {
    fontSize: 13,
    lineHeight: 18,
  },
});
