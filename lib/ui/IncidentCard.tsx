/**
 * IncidentCard
 *
 * Card component for displaying incident information in the feed.
 * Includes incident type, severity, location, and time.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card, Text, Icon } from '@rneui/themed';
import { NEUTRAL, SEVERITY_COLORS, PRIMARY } from '../brand/colors';
import { SeverityBadge } from './StatusBadge';

interface IncidentLocation {
  address?: string;
  city?: string;
  state?: string;
  lat: number;
  lng: number;
}

interface IncidentData {
  id: string;
  title: string;
  description?: string;
  type: string;
  severity: 1 | 2 | 3 | 4 | 5;
  location: IncidentLocation;
  occurredAt: Date | string;
  source?: string;
}

interface IncidentCardProps {
  incident: IncidentData;
  onPress?: (incident: IncidentData) => void;
  /** Show full description (default: truncated) */
  expanded?: boolean;
  /** Show distance from user */
  distance?: string;
}

// Incident type emoji and color mapping
const incidentTypeConfig: Record<string, { emoji: string; color: string }> = {
  fire: { emoji: '🔥', color: '#DC2626' },
  medical: { emoji: '🚑', color: '#EF4444' },
  crime: { emoji: '🚨', color: '#7C2D12' },
  traffic: { emoji: '🚗', color: '#F59E0B' },
  weather: { emoji: '⛈️', color: '#3B82F6' },
  hazmat: { emoji: '☢️', color: '#A855F7' },
  missing: { emoji: '🔍', color: '#EC4899' },
  robbery: { emoji: '💰', color: '#B91C1C' },
  assault: { emoji: '⚠️', color: '#DC2626' },
  burglary: { emoji: '🏠', color: '#92400E' },
  shooting: { emoji: '🔫', color: '#7F1D1D' },
  other: { emoji: '📢', color: '#71717A' },
};

function getTypeConfig(type: string) {
  const normalized = type.toLowerCase().replace(/[_-]/g, '');
  return incidentTypeConfig[normalized] ?? incidentTypeConfig.other;
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString();
}

function formatLocation(location: IncidentLocation): string {
  if (location.address) {
    return location.address;
  }
  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }
  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}

export function IncidentCard({
  incident,
  onPress,
  expanded = false,
  distance,
}: IncidentCardProps) {
  const typeConfig = getTypeConfig(incident.type);
  const timeAgo = formatTimeAgo(incident.occurredAt);
  const locationText = formatLocation(incident.location);

  const content = (
    <Card containerStyle={styles.card}>
      {/* Header Row: Type Badge + Severity */}
      <View style={styles.headerRow}>
        <View style={styles.typeContainer}>
          <Text style={[styles.typeEmoji, { backgroundColor: typeConfig.color }]}>
            {typeConfig.emoji}
          </Text>
          <Text style={styles.typeText}>
            {incident.type.charAt(0).toUpperCase() + incident.type.slice(1)}
          </Text>
        </View>
        <SeverityBadge severity={incident.severity} showNumber />
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={expanded ? undefined : 2}>
        {incident.title}
      </Text>

      {/* Description (if available and expanded) */}
      {incident.description && (
        <Text
          style={styles.description}
          numberOfLines={expanded ? undefined : 2}
        >
          {incident.description}
        </Text>
      )}

      {/* Footer Row: Location + Time */}
      <View style={styles.footerRow}>
        <View style={styles.locationContainer}>
          <Icon
            name="location-on"
            type="material"
            size={14}
            color={NEUTRAL.textMuted}
          />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationText}
          </Text>
          {distance && (
            <Text style={styles.distanceText}> ({distance})</Text>
          )}
        </View>
        <Text style={styles.timeText}>{timeAgo}</Text>
      </View>

      {/* Source (if available) */}
      {incident.source && (
        <View style={styles.sourceContainer}>
          <Text style={styles.sourceText}>
            via {incident.source}
          </Text>
        </View>
      )}
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={() => onPress(incident)}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// ============ COMPACT VARIANT ============

interface CompactIncidentCardProps {
  incident: IncidentData;
  onPress?: (incident: IncidentData) => void;
}

export function CompactIncidentCard({ incident, onPress }: CompactIncidentCardProps) {
  const typeConfig = getTypeConfig(incident.type);
  const timeAgo = formatTimeAgo(incident.occurredAt);

  const content = (
    <View style={styles.compactCard}>
      <Text style={[styles.compactEmoji, { backgroundColor: typeConfig.color }]}>
        {typeConfig.emoji}
      </Text>
      <View style={styles.compactContent}>
        <Text style={styles.compactTitle} numberOfLines={1}>
          {incident.title}
        </Text>
        <Text style={styles.compactMeta}>
          {incident.location.city || 'Unknown'} • {timeAgo}
        </Text>
      </View>
      <View style={[styles.compactSeverity, { backgroundColor: getSeverityColor(incident.severity) }]}>
        <Text style={styles.compactSeverityText}>{incident.severity}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={() => onPress(incident)} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

function getSeverityColor(severity: number): string {
  const colors: Record<number, string> = {
    1: SEVERITY_COLORS.info,
    2: SEVERITY_COLORS.low,
    3: SEVERITY_COLORS.medium,
    4: SEVERITY_COLORS.high,
    5: SEVERITY_COLORS.critical,
  };
  return colors[severity] ?? SEVERITY_COLORS.info;
}

// ============ STYLES ============

const styles = StyleSheet.create({
  card: {
    backgroundColor: NEUTRAL.darkElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NEUTRAL.darkBorder,
    padding: 14,
    margin: 0,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeEmoji: {
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  typeText: {
    color: NEUTRAL.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    color: NEUTRAL.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 6,
  },
  description: {
    color: NEUTRAL.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  locationText: {
    color: NEUTRAL.textMuted,
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  },
  distanceText: {
    color: PRIMARY.DEFAULT,
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    color: NEUTRAL.textMuted,
    fontSize: 12,
  },
  sourceContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.darkBorder,
  },
  sourceText: {
    color: NEUTRAL.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Compact variant styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEUTRAL.darkElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: NEUTRAL.darkBorder,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  compactEmoji: {
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    color: NEUTRAL.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  compactMeta: {
    color: NEUTRAL.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  compactSeverity: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactSeverityText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
