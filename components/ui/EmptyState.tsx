/**
 * EmptyState
 *
 * Empty state placeholder for lists and screens with no content.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button, Icon } from '@rneui/themed';
import { NEUTRAL, PRIMARY } from '@lib/brand/colors';

interface EmptyStateProps {
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Icon name (material icons) */
  icon?: string;
  iconType?: string;
  /** Primary action button */
  action?: string;
  onAction?: () => void;
  /** Secondary action */
  secondaryAction?: string;
  onSecondaryAction?: () => void;
  /** Large emoji to display instead of icon */
  emoji?: string;
}

export function EmptyState({
  title,
  description,
  icon = 'inbox',
  iconType = 'material',
  action,
  onAction,
  secondaryAction,
  onSecondaryAction,
  emoji,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {emoji ? (
        <Text style={styles.emoji}>{emoji}</Text>
      ) : (
        <View style={styles.iconContainer}>
          <Icon
            name={icon}
            type={iconType}
            size={64}
            color={NEUTRAL.textMuted}
          />
        </View>
      )}

      <Text style={styles.title}>{title}</Text>

      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      {action && onAction && (
        <Button
          title={action}
          onPress={onAction}
          containerStyle={styles.buttonContainer}
          buttonStyle={styles.primaryButton}
        />
      )}

      {secondaryAction && onSecondaryAction && (
        <Button
          title={secondaryAction}
          onPress={onSecondaryAction}
          type="clear"
          titleStyle={styles.secondaryButtonText}
          containerStyle={styles.secondaryButtonContainer}
        />
      )}
    </View>
  );
}

// ============ PRESET EMPTY STATES ============

export function NoIncidentsEmpty({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyState
      emoji="🎉"
      title="All Clear!"
      description="No incidents reported in your area. Stay safe and check back later."
      action={onRefresh ? "Refresh" : undefined}
      onAction={onRefresh}
    />
  );
}

export function NoRelaysEmpty({ onAddRelay }: { onAddRelay?: () => void }) {
  return (
    <EmptyState
      emoji="🌐"
      title="No Relays Connected"
      description="Add a Nostr relay to start receiving incident updates."
      action="Add Relay"
      onAction={onAddRelay}
    />
  );
}

export function OfflineEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon="wifi-off"
      title="You're Offline"
      description="Check your internet connection and try again."
      action="Retry"
      onAction={onRetry}
    />
  );
}

export function ErrorEmpty({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon="error-outline"
      title="Something went wrong"
      description={message ?? "An unexpected error occurred. Please try again."}
      action="Try Again"
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconContainer: {
    marginBottom: 20,
    opacity: 0.6,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    color: NEUTRAL.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: NEUTRAL.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    minWidth: 140,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: PRIMARY.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  secondaryButtonContainer: {
    marginTop: 8,
  },
  secondaryButtonText: {
    color: PRIMARY.DEFAULT,
    fontSize: 14,
    fontWeight: '600',
  },
});
