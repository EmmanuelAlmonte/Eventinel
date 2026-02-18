/**
 * useMapScreenState
 *
 * Composes shared-map state, handlers, and memoized incident data for the map screen.
 */

import { useCallback, useMemo } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

import { type AppNavigation } from '@lib/navigation';
import { useRelayStatus, useSharedIncidents, useSharedLocation } from '@contexts';
import { useAppTheme, type ProcessedIncident } from '@hooks';
import { incidentsToFeatureCollection } from '@lib/map/types';
import {
  logIncidentNavFlow,
  markIncidentNavTrace,
  startIncidentNavTrace,
} from '@lib/debug/incidentNavigationTrace';

import { buildRelayBannerStatus, formatRelayList } from './helpers';
import type { ShapeSourceFeatureProperties, ShapeSourcePressEvent } from './config';
import { useMapCamera } from './useMapCamera';
import { useMapViewportSubscription } from './useMapViewportSubscription';

export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied' | undefined;

const ZERO_MAP_LAYOUT_WIDTH = 0;

export type MapScreenCamera = ReturnType<typeof useMapCamera>;
export type MapScreenViewport = ReturnType<typeof useMapViewportSubscription>;

export type MapScreenState = {
  colors: {
    border: string;
    primary: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  insets: EdgeInsets;
  relayStatus: ReturnType<typeof buildRelayBannerStatus>;
  userLocation: [number, number] | null;
  hasReceivedHistory: boolean;
  visibleIncidents: ProcessedIncident[];
  incidentFeatureCollection: ReturnType<typeof incidentsToFeatureCollection>;
  isLoadingLocation: boolean;
  isFocused: boolean;
  isViewportCoveredBySubscriptionGrid: boolean;
  permission: LocationPermissionStatus;
  camera: MapScreenCamera;
  viewport: MapScreenViewport;
  locationSource: string | null;
  handleShapeSourcePress: (event: ShapeSourcePressEvent) => Promise<void>;
  handleMapLayout: (event: LayoutChangeEvent) => void;
  handleRelaySettings: () => void;
  refreshLocation: () => void;
};

function normalizeLocationPermission(
  permission: string | undefined
): LocationPermissionStatus {
  if (permission === 'undetermined' || permission === 'granted' || permission === 'denied') {
    return permission;
  }

  return undefined;
}

function getPointCoordinates(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }
  if (typeof value[0] !== 'number' || !Number.isFinite(value[0])) {
    return null;
  }
  if (typeof value[1] !== 'number' || !Number.isFinite(value[1])) {
    return null;
  }

  return [value[0], value[1]];
}

function extractIncidentIdFromShapeSourceProperties(
  properties: ShapeSourceFeatureProperties | undefined
): string | null {
  if (!properties || typeof properties.incidentId !== 'string') {
    return null;
  }

  const trimmed = properties.incidentId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getClusterCenterFromFeature(
  feature: ShapeSourcePressEvent['features'][number]
): [number, number] | null {
  const geometry = feature?.geometry;
  if (!geometry || geometry.type !== 'Point') {
    return null;
  }

  return getPointCoordinates(geometry.coordinates);
}

export function useMapScreenState(): MapScreenState {
  const navigation = useNavigation<AppNavigation>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { hasConnectedRelay, hasRelays, isConnecting, relays } = useRelayStatus();
  const {
    location: userLocation,
    isLoading: isLoadingLocation,
    source: locationSource,
    permission: rawLocationPermission,
    refresh: refreshLocation,
  } = useSharedLocation();
  const permission = normalizeLocationPermission(rawLocationPermission);
  const {
    incidents,
    hasReceivedHistory,
    setMapFocused,
    setMapSubscriptionAnchor,
    setMapSubscriptionViewport,
  } = useSharedIncidents();

  const camera = useMapCamera({ userLocation });
  const viewport = useMapViewportSubscription({
    isFocused,
    lastCameraZoomRef: camera.lastCameraZoomRef,
    setMapFocused,
    setMapSubscriptionAnchor,
    setMapSubscriptionViewport,
  });

  const visibleIncidents = incidents;
  const incidentFeatureCollection = useMemo(
    () => incidentsToFeatureCollection(visibleIncidents),
    [visibleIncidents]
  );

  const handleIncidentPress = useCallback(
    (incidentId: string) => {
      markIncidentNavTrace({
        incidentId,
        source: 'map-marker',
        stage: 'map.navigate.before',
      });
      navigation.navigate('IncidentDetail', { incidentId });
      markIncidentNavTrace({
        incidentId,
        source: 'map-marker',
        stage: 'map.navigate.after',
      });
    },
    [navigation]
  );

  const handleShapeSourcePress = useCallback(
    async (event: ShapeSourcePressEvent) => {
      logIncidentNavFlow('map.shape-source.press.received', {
        featureCount: event?.features?.length ?? 0,
      });
      const feature = event?.features?.[0];
      if (!feature) {
        logIncidentNavFlow('map.shape-source.press.ignored.no-feature');
        return;
      }

      const properties = feature.properties as ShapeSourceFeatureProperties | undefined;
      if (properties?.cluster) {
        logIncidentNavFlow('map.shape-source.press.cluster', {
          isCluster: true,
        });
        const centerCoordinate = getClusterCenterFromFeature(feature);
        if (!centerCoordinate) {
          logIncidentNavFlow('map.shape-source.press.cluster.ignored.invalid-center');
          return;
        }

        camera.clearAutoResumeTimer();
        camera.setFollowUser(false);

        const zoom = await camera.shapeSourceRef.current?.getClusterExpansionZoom(feature);
        if (zoom == null) {
          return;
        }

        camera.cameraRef.current?.setCamera({
          centerCoordinate,
          zoomLevel: zoom,
          animationDuration: 400,
          animationMode: 'easeTo',
        });
        camera.scheduleAutoResume();
        return;
      }

      const incidentId = extractIncidentIdFromShapeSourceProperties(properties);
      if (incidentId) {
        startIncidentNavTrace({
          incidentId,
          source: 'map-marker',
          stage: 'map.marker.press.start',
        });
        markIncidentNavTrace({
          incidentId,
          source: 'map-marker',
          stage: 'map.marker.press.extracted-incident-id',
        });
        handleIncidentPress(incidentId);
      } else {
        logIncidentNavFlow('map.shape-source.press.ignored.no-incident-id');
      }
    },
    [camera, handleIncidentPress]
  );

  const handleMapLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (event.nativeEvent.layout.width > ZERO_MAP_LAYOUT_WIDTH && !camera.mapReady) {
        camera.setMapReady(true);
      }
    },
    [camera]
  );

  const handleRelaySettings = useCallback(() => {
    navigation.navigate('Relays');
  }, [navigation]);

  const relayStatus = buildRelayBannerStatus({
    hasConnectedRelay,
    hasRelays,
    isConnecting,
    relayLabel: formatRelayList(relays.map((relay) => relay.url)),
  });

  return {
    colors: {
      border: colors.border,
      primary: colors.primary,
      surface: colors.surface,
      text: colors.text,
      textMuted: colors.textMuted,
    },
    insets,
    relayStatus,
    userLocation,
    hasReceivedHistory,
    visibleIncidents,
    incidentFeatureCollection,
    isLoadingLocation,
    isFocused,
    isViewportCoveredBySubscriptionGrid: viewport.isViewportCoveredBySubscriptionGrid,
    permission,
    camera,
    viewport,
    locationSource,
    handleShapeSourcePress,
    handleMapLayout,
    handleRelaySettings,
    refreshLocation,
  };
}
