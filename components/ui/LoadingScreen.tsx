/**
 * LoadingScreen
 *
 * Full-screen loading indicator with optional message.
 * Includes animated skeleton components for content placeholders.
 */

import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Text, Skeleton } from '@rneui/themed';
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
  /** Number of description lines to show */
  lines?: number;
  /** Animation type */
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Animated skeleton card that mimics incident card layout.
 * Uses RNE Skeleton for smooth pulse/wave animations.
 */
export function SkeletonCard({ lines = 2, animation = 'pulse' }: SkeletonCardProps) {
  return (
    <View style={styles.skeletonCard}>
      {/* Row: Icon + Content + Chevron */}
      <View style={styles.skeletonRow}>
        {/* Icon placeholder */}
        <Skeleton
          animation={animation}
          width={48}
          height={48}
          style={styles.skeletonIcon}
        />

        {/* Content area */}
        <View style={styles.skeletonContent}>
          {/* Title row with badge */}
          <View style={styles.skeletonTitleRow}>
            <Skeleton animation={animation} width="65%" height={16} />
            <Skeleton animation={animation} width={50} height={20} style={styles.skeletonBadge} />
          </View>

          {/* Description lines */}
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
              key={i}
              animation={animation}
              width={`${90 - i * 15}%`}
              height={12}
              style={styles.skeletonLine}
            />
          ))}

          {/* Meta row */}
          <View style={styles.skeletonMetaRow}>
            <Skeleton animation={animation} width={80} height={10} />
            <Skeleton animation={animation} width={100} height={10} />
          </View>
        </View>

        {/* Chevron placeholder */}
        <Skeleton animation={animation} width={24} height={24} />
      </View>
    </View>
  );
}

interface SkeletonListProps {
  /** Number of skeleton cards to show */
  count?: number;
  /** Animation type */
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * List of skeleton cards for loading states.
 */
export function SkeletonList({ count = 3, animation = 'pulse' }: SkeletonListProps) {
  return (
    <View style={styles.skeletonListContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} animation={animation} />
      ))}
    </View>
  );
}

/**
 * Map loading skeleton - shows a large placeholder for the map area.
 */
export function MapSkeleton({ animation = 'pulse' }: { animation?: 'pulse' | 'wave' | 'none' }) {
  return (
    <View style={styles.mapSkeletonContainer}>
      <Skeleton
        animation={animation}
        width="100%"
        height="100%"
        style={styles.mapSkeleton}
      />
      <View style={styles.mapSkeletonOverlay}>
        <Skeleton animation={animation} circle width={48} height={48} />
        <Text style={styles.mapSkeletonText}>Loading map...</Text>
      </View>
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

  // Skeleton card styles (mimics incident card layout)
  skeletonCard: {
    backgroundColor: NEUTRAL.darkElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NEUTRAL.darkBorder,
    borderLeftWidth: 4,
    borderLeftColor: NEUTRAL.darkBorder,
    padding: 16,
    marginBottom: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonIcon: {
    borderRadius: 12,
    marginRight: 14,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skeletonBadge: {
    borderRadius: 6,
  },
  skeletonLine: {
    marginBottom: 6,
    borderRadius: 4,
  },
  skeletonMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  skeletonListContainer: {
    paddingHorizontal: 0,
  },

  // Map skeleton styles
  mapSkeletonContainer: {
    flex: 1,
    backgroundColor: NEUTRAL.dark,
  },
  mapSkeleton: {
    borderRadius: 0,
  },
  mapSkeletonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  mapSkeletonText: {
    color: NEUTRAL.textMuted,
    fontSize: 16,
  },
});
