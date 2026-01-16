/**
 * SeverityBadge Component
 *
 * Displays a severity indicator pill with severity-based colors.
 */

import { View, StyleSheet } from 'react-native';
import { Text } from '@rneui/themed';
import { SEVERITY_COLORS } from '../../lib/nostr/config';
import type { Severity } from '../../lib/nostr/config';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const color = SEVERITY_COLORS[severity];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `${color}20` },
        isSmall && styles.badgeSmall,
      ]}
    >
      <Text
        style={[styles.text, { color }, isSmall && styles.textSmall]}
      >
        {severity}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 12,
  },
});
