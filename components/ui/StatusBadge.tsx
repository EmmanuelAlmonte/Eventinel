/**
 * StatusBadge & SeverityBadge
 *
 * Badge components for displaying status and severity indicators.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Badge, Text } from '@rneui/themed';
import { SEMANTIC, SEVERITY_COLORS, NEUTRAL } from '@lib/brand/colors';

// ============ STATUS BADGE ============

type StatusType = 'success' | 'error' | 'warning' | 'info' | 'neutral';

const statusColorMap: Record<StatusType, string> = {
  success: SEMANTIC.safe,
  error: SEMANTIC.alert,
  warning: SEMANTIC.warning,
  info: SEMANTIC.info,
  neutral: NEUTRAL.darkBorder,
};

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  /** Show as outlined instead of filled */
  outline?: boolean;
  /** Additional container style */
  style?: ViewStyle;
}

export function StatusBadge({ status, label, outline = false, style }: StatusBadgeProps) {
  const color = statusColorMap[status];

  return (
    <View
      style={[
        styles.badgeContainer,
        outline
          ? { borderColor: color, borderWidth: 1, backgroundColor: 'transparent' }
          : { backgroundColor: color },
        style,
      ]}
    >
      <Text style={[styles.badgeText, outline && { color }]}>{label}</Text>
    </View>
  );
}

// ============ SEVERITY BADGE ============

type SeverityLevel = 1 | 2 | 3 | 4 | 5 | 'critical' | 'high' | 'medium' | 'low' | 'info';

const severityLabels: Record<number, string> = {
  1: 'Low',
  2: 'Low',
  3: 'Medium',
  4: 'High',
  5: 'Critical',
};

const severityColors: Record<number, string> = {
  1: SEVERITY_COLORS.info,
  2: SEVERITY_COLORS.low,
  3: SEVERITY_COLORS.medium,
  4: SEVERITY_COLORS.high,
  5: SEVERITY_COLORS.critical,
};

function getSeverityColor(level: SeverityLevel): string {
  if (typeof level === 'number') {
    return severityColors[level] ?? SEVERITY_COLORS.info;
  }
  return SEVERITY_COLORS[level] ?? SEVERITY_COLORS.info;
}

function getSeverityLabel(level: SeverityLevel): string {
  if (typeof level === 'number') {
    return severityLabels[level] ?? 'Unknown';
  }
  return level.charAt(0).toUpperCase() + level.slice(1);
}

interface SeverityBadgeProps {
  /** Severity level: 1-5 or named level */
  severity: SeverityLevel;
  /** Custom label (defaults to severity name) */
  label?: string;
  /** Show severity number */
  showNumber?: boolean;
  /** Additional container style */
  style?: ViewStyle;
}

export function SeverityBadge({
  severity,
  label,
  showNumber = false,
  style,
}: SeverityBadgeProps) {
  const color = getSeverityColor(severity);
  const text = label ?? getSeverityLabel(severity);
  const number = typeof severity === 'number' ? severity : null;

  return (
    <View style={[styles.severityContainer, { backgroundColor: color }, style]}>
      {showNumber && number && (
        <Text style={styles.severityNumber}>{number}</Text>
      )}
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

// ============ INCIDENT TYPE BADGE ============

type IncidentType =
  | 'fire'
  | 'medical'
  | 'crime'
  | 'traffic'
  | 'weather'
  | 'hazmat'
  | 'missing'
  | 'other';

const incidentTypeConfig: Record<IncidentType, { label: string; color: string; emoji: string }> = {
  fire: { label: 'Fire', color: '#DC2626', emoji: '🔥' },
  medical: { label: 'Medical', color: '#EF4444', emoji: '🚑' },
  crime: { label: 'Crime', color: '#7C2D12', emoji: '🚨' },
  traffic: { label: 'Traffic', color: '#F59E0B', emoji: '🚗' },
  weather: { label: 'Weather', color: '#3B82F6', emoji: '⛈️' },
  hazmat: { label: 'Hazmat', color: '#A855F7', emoji: '☢️' },
  missing: { label: 'Missing', color: '#EC4899', emoji: '🔍' },
  other: { label: 'Other', color: '#71717A', emoji: '📢' },
};

interface IncidentTypeBadgeProps {
  type: IncidentType | string;
  showEmoji?: boolean;
  style?: ViewStyle;
}

export function IncidentTypeBadge({ type, showEmoji = true, style }: IncidentTypeBadgeProps) {
  const config = incidentTypeConfig[type as IncidentType] ?? incidentTypeConfig.other;

  return (
    <View style={[styles.badgeContainer, { backgroundColor: config.color }, style]}>
      <Text style={styles.badgeText}>
        {showEmoji && `${config.emoji} `}
        {config.label}
      </Text>
    </View>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  severityNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
