/**
 * SectionHeader
 *
 * Section header with optional action button.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { NEUTRAL, PRIMARY } from '../brand/colors';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Action button text */
  action?: string;
  /** Action button handler */
  onAction?: () => void;
  /** Optional icon before title */
  icon?: string;
  iconType?: string;
  /** Additional top margin (default: 24 for non-first sections) */
  marginTop?: number;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  icon,
  iconType = 'material',
  marginTop = 24,
}: SectionHeaderProps) {
  return (
    <View style={[styles.container, { marginTop }]}>
      <View style={styles.titleContainer}>
        {icon && (
          <Icon
            name={icon}
            type={iconType}
            size={20}
            color={PRIMARY.DEFAULT}
            containerStyle={styles.icon}
          />
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} style={styles.actionButton}>
          <Text style={styles.actionText}>{action}</Text>
          <Icon
            name="chevron-right"
            type="material"
            size={18}
            color={PRIMARY.DEFAULT}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: NEUTRAL.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: NEUTRAL.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 8,
  },
  actionText: {
    color: PRIMARY.DEFAULT,
    fontSize: 14,
    fontWeight: '600',
  },
});
