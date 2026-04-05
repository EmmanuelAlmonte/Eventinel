import { Image, Pressable, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@rneui/themed';

import { formatRelativeTime } from '@lib/utils/time';
import type { ProcessedIncident } from '@hooks/useIncidentSubscription';

type TypeConfig = {
  color: string;
  label: string;
};

type ThemeColors = {
  success: string;
  surface: string;
  text: string;
  textMuted: string;
};

type IncidentDetailInfoCardsProps = {
  incident: ProcessedIncident;
  colors: ThemeColors;
  typeConfig: TypeConfig;
  typeIconSource: ImageSourcePropType;
  severityColor: string;
  onShare: () => void;
};

export function IncidentDetailInfoCards({
  incident,
  colors,
  typeConfig,
  typeIconSource,
  severityColor,
  onShare,
}: IncidentDetailInfoCardsProps) {
  const trustLabel = incident.isVerified ? 'Verified' : 'Community report';
  const sourceLabel = incident.source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const locationLabel = incident.location.city
    ? `${incident.location.city}${incident.location.state ? `, ${incident.location.state}` : ''}`
    : incident.location.address;
  const metaLine = [formatRelativeTime(incident.occurredAt), locationLabel, sourceLabel].join(' · ');

  return (
    <View style={styles.section}>
      <View style={styles.badgeRow}>
        <View style={[styles.primaryBadge, { backgroundColor: `${typeConfig.color}1F` }]}>
          <Image
            source={typeIconSource}
            style={[styles.typeIconImage, { tintColor: severityColor }]}
            resizeMode="contain"
          />
          <Text style={[styles.primaryBadgeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
        </View>

        <View
          style={[
            styles.secondaryBadge,
            {
              backgroundColor: incident.isVerified
                ? `${colors.success}10`
                : 'rgba(148, 163, 184, 0.08)',
            },
          ]}
        >
          <Icon
            name={incident.isVerified ? 'verified' : 'groups'}
            type="material"
            size={13}
            color={incident.isVerified ? colors.success : colors.textMuted}
          />
          <Text
            style={[
              styles.secondaryBadgeText,
              {
                color: incident.isVerified ? colors.success : colors.textMuted,
              },
            ]}
          >
            {trustLabel}
          </Text>
        </View>
      </View>

      <Text style={[styles.incidentTitle, { color: colors.text }]}>{incident.title}</Text>

      <Text style={[styles.description, { color: colors.textMuted }]}>{incident.description}</Text>

      <Text style={[styles.metaLine, { color: colors.textMuted }]}>{metaLine}</Text>

      <View style={styles.locationRow}>
        <Icon name="location-on" type="material" size={16} color={typeConfig.color} />
        <Text style={[styles.locationText, { color: colors.text }]}>{incident.location.address}</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => {}}
          accessibilityRole="button"
          accessibilityLabel="View on map"
          style={[styles.actionButton, styles.primaryActionButton, { backgroundColor: colors.text }]}
        >
          <Icon name="navigation" type="material" size={18} color={colors.surface} />
          <Text style={[styles.primaryActionText, { color: colors.surface }]}>View on map</Text>
        </Pressable>
        <Pressable
          onPress={onShare}
          style={[
            styles.actionButton,
            styles.secondaryActionButton,
            { backgroundColor: colors.surface },
          ]}
        >
          <Icon name="share" type="material" size={18} color={colors.text} />
          <Text style={[styles.secondaryActionText, { color: colors.text }]}>Share</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  secondaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  primaryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeIconImage: {
    width: 16,
    height: 16,
  },
  incidentTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
  },
  metaLine: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 16,
  },
  primaryActionButton: {
    borderWidth: 0,
  },
  secondaryActionButton: {
    borderWidth: 0,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
