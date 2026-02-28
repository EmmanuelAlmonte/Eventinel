/**
 * Incident cards used by list and compact feed views.
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Card, Text, Icon } from '@rneui/themed';
import { NEUTRAL } from '@lib/brand/colors';

import { SeverityBadge } from './StatusBadge';
import {
  formatLocation,
  formatTimeAgo,
  getSeverityColor,
  getTypeConfig,
} from './incidentCardHelpers';
import { incidentCardStyles as styles } from './incidentCardStyles';
import type { CompactIncidentCardProps, IncidentCardProps } from './incidentCardTypes';

function IncidentCardContent({
  incident,
  expanded,
  distance,
}: Pick<IncidentCardProps, 'incident' | 'expanded' | 'distance'>) {
  const typeConfig = getTypeConfig(incident.type);
  const timeAgo = formatTimeAgo(incident.occurredAt);
  const locationText = formatLocation(incident.location);

  return (
    <Card containerStyle={styles.card}>
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

      <Text style={styles.title} numberOfLines={expanded ? undefined : 2}>
        {incident.title}
      </Text>

      {incident.description && (
        <Text style={styles.description} numberOfLines={expanded ? undefined : 2}>
          {incident.description}
        </Text>
      )}

      <View style={styles.footerRow}>
        <View style={styles.locationContainer}>
          <Icon name="location-on" type="material" size={14} color={NEUTRAL.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationText}
          </Text>
          {distance && <Text style={styles.distanceText}> ({distance})</Text>}
        </View>
        <Text style={styles.timeText}>{timeAgo}</Text>
      </View>

      {incident.source && (
        <View style={styles.sourceContainer}>
          <Text style={styles.sourceText}>via {incident.source}</Text>
        </View>
      )}
    </Card>
  );
}

export function IncidentCard({
  incident,
  onPress,
  expanded = false,
  distance,
}: IncidentCardProps) {
  const content = (
    <IncidentCardContent
      incident={incident}
      expanded={expanded}
      distance={distance}
    />
  );

  if (!onPress) return content;
  return (
    <TouchableOpacity onPress={() => onPress(incident)} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

function CompactIncidentCardContent({ incident }: Pick<CompactIncidentCardProps, 'incident'>) {
  const typeConfig = getTypeConfig(incident.type);
  const timeAgo = formatTimeAgo(incident.occurredAt);

  return (
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
}

export function CompactIncidentCard({ incident, onPress }: CompactIncidentCardProps) {
  const content = <CompactIncidentCardContent incident={incident} />;
  if (!onPress) return content;
  return (
    <TouchableOpacity onPress={() => onPress(incident)} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}
