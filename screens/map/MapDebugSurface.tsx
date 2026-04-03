import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native';
import { Icon } from '@rneui/themed';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { buildFlags } from '@lib/buildFlags';

import type { LocationPermissionStatus } from './useMapScreenState';
import { mapScreenStyles as styles } from './styles';

type MapDebugSurfaceProps = {
  insets: EdgeInsets;
  userLocation: [number, number] | null;
  visibleIncidentCount: number;
  hasReceivedHistory: boolean;
  locationSource: string | null;
  permission: LocationPermissionStatus;
};

function DebugRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.debugRow}>
      <Text style={styles.debugLabel}>{label}</Text>
      <Text style={styles.debugValue}>{value}</Text>
    </View>
  );
}

function formatLocationSource(locationSource: string | null) {
  if (!locationSource) {
    return 'none';
  }

  return locationSource.toUpperCase();
}

function formatCoordinates(userLocation: [number, number] | null) {
  if (!userLocation) {
    return 'unavailable';
  }

  return `${userLocation[1].toFixed(4)}, ${userLocation[0].toFixed(4)}`;
}

export function MapDebugSurface({
  insets,
  userLocation,
  visibleIncidentCount,
  hasReceivedHistory,
  locationSource,
  permission,
}: MapDebugSurfaceProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!buildFlags.showDebugUI) {
    return null;
  }

  return (
    <>
      {isOpen ? (
        <View style={[styles.debugSheet, { bottom: 28 + insets.bottom }]}>
          <View style={styles.debugSheetHeader}>
            <View>
              <Text style={styles.debugSheetTitle}>Developer Diagnostics</Text>
              <Text style={styles.debugSheetBadge}>non-production only</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close developer diagnostics"
              onPress={() => setIsOpen(false)}
              style={({ pressed }) => [
                styles.debugSheetClose,
                pressed && styles.debugLauncherPressed,
              ]}
            >
              <Icon name="close" type="material" size={16} color="#E2E8F0" />
            </Pressable>
          </View>

          <DebugRow label="Incidents loaded" value={String(visibleIncidentCount)} />
          <DebugRow
            label="History seed"
            value={hasReceivedHistory ? 'complete' : 'pending'}
          />
          <DebugRow label="Location source" value={formatLocationSource(locationSource)} />
          <DebugRow label="Permission" value={permission ?? 'undetermined'} />
          <DebugRow label="Coordinates" value={formatCoordinates(userLocation)} />
        </View>
      ) : null}

      {!isOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open developer diagnostics"
          onPress={() => setIsOpen(true)}
          style={({ pressed }) => [
            styles.debugLauncher,
            { bottom: 170 + insets.bottom },
            pressed && styles.debugLauncherPressed,
          ]}
        >
          <Text style={styles.debugLauncherText}>DEV</Text>
        </Pressable>
      ) : null}
    </>
  );
}
