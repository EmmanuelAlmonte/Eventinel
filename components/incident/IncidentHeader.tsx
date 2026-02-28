/**
 * IncidentHeader Component
 *
 * Displays incident type icon, title, badges, and metadata.
 * Uses occurredAtMs for time display.
 */

import { View, StyleSheet } from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { TYPE_CONFIG, SEVERITY_COLORS } from '@lib/nostr/config';
import type { IncidentType, Severity } from '@lib/nostr/config';
import { useAppTheme } from '@hooks';
import { formatRelativeTimeMs } from '@lib/utils/time';

interface IncidentHeaderProps {
  type: IncidentType;
  title: string;
  severity: Severity;
  /** When incident occurred (ms since epoch) */
  occurredAtMs: number;
  verified?: boolean;
}

export function IncidentHeader({
  type,
  title,
  severity,
  occurredAtMs,
  verified = true,
}: IncidentHeaderProps) {
  const { colors } = useAppTheme();
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.other;
  const severityColor = SEVERITY_COLORS[severity];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={config.gradient}
        style={styles.iconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Icon name={config.icon} type="material" size={28} color="#fff" />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.badges}>
          <Text style={[styles.typeLabel, { color: config.color }]}>
            {config.label.toUpperCase()}
          </Text>
          {verified && (
            <View style={[styles.verifiedBadge, { backgroundColor: `${colors.success}20` }]}>
              <Text style={[styles.verifiedText, { color: colors.success }]}>
                Verified
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {title}
        </Text>

        <View style={styles.meta}>
          <Icon name="schedule" type="material" size={14} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {formatRelativeTimeMs(occurredAtMs)}
          </Text>
          <View style={[styles.severityDot, { backgroundColor: severityColor }]} />
          <Text style={[styles.metaText, { color: severityColor }]}>
            Severity {severity}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 14,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
});
