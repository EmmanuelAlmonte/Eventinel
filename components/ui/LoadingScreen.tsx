/**
 * LoadingScreen
 *
 * Full-screen loading indicator with optional message.
 */

import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Text } from '@rneui/themed';
import { NEUTRAL, PRIMARY } from '@lib/brand/colors';

interface LoadingScreenProps {
  /** Loading message */
  message?: string;
  /** Smaller inline variant */
  inline?: boolean;
  /** Custom color for spinner */
  color?: string;
  /** Size of the spinner */
  size?: 'small' | 'large';
}

export function LoadingScreen({
  message = 'Loading...',
  inline = false,
  color = PRIMARY.DEFAULT,
  size = 'large',
}: LoadingScreenProps) {
  if (inline) {
    return (
      <View style={styles.inlineContainer}>
        <ActivityIndicator size={size} color={color} />
        {message && <Text style={styles.inlineMessage}>{message}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

// ============ PRESET LOADING STATES ============

export function ConnectingToRelays() {
  return (
    <LoadingScreen message="Connecting to relays..." />
  );
}

export function LoadingIncidents() {
  return (
    <LoadingScreen message="Loading incidents..." />
  );
}

export function LoadingProfile() {
  return (
    <LoadingScreen message="Loading profile..." />
  );
}

export function SigningIn() {
  return (
    <LoadingScreen message="Signing in..." />
  );
}

// ============ SKELETON PLACEHOLDER ============

interface SkeletonCardProps {
  lines?: number;
}

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={[styles.skeletonBadge, styles.shimmer]} />
        <View style={[styles.skeletonBadgeSmall, styles.shimmer]} />
      </View>
      <View style={[styles.skeletonTitle, styles.shimmer]} />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.skeletonLine,
            styles.shimmer,
            { width: `${85 - i * 15}%` },
          ]}
        />
      ))}
      <View style={styles.skeletonFooter}>
        <View style={[styles.skeletonMeta, styles.shimmer]} />
        <View style={[styles.skeletonMetaSmall, styles.shimmer]} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NEUTRAL.dark,
    paddingHorizontal: 32,
  },
  message: {
    color: NEUTRAL.textMuted,
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  inlineMessage: {
    color: NEUTRAL.textMuted,
    fontSize: 14,
  },

  // Skeleton styles
  skeletonCard: {
    backgroundColor: NEUTRAL.darkElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NEUTRAL.darkBorder,
    padding: 14,
    marginBottom: 12,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skeletonBadge: {
    width: 80,
    height: 24,
    borderRadius: 6,
    backgroundColor: NEUTRAL.darkBorder,
  },
  skeletonBadgeSmall: {
    width: 60,
    height: 24,
    borderRadius: 6,
    backgroundColor: NEUTRAL.darkBorder,
  },
  skeletonTitle: {
    width: '90%',
    height: 18,
    borderRadius: 4,
    backgroundColor: NEUTRAL.darkBorder,
    marginBottom: 8,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
    backgroundColor: NEUTRAL.darkBorder,
    marginBottom: 6,
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  skeletonMeta: {
    width: 120,
    height: 12,
    borderRadius: 4,
    backgroundColor: NEUTRAL.darkBorder,
  },
  skeletonMetaSmall: {
    width: 60,
    height: 12,
    borderRadius: 4,
    backgroundColor: NEUTRAL.darkBorder,
  },
  shimmer: {
    opacity: 0.5,
  },
});
