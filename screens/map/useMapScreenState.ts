/**
 * useMapScreenState
 *
 * Composes shared-map state, handlers, and memoized incident data for the map screen.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { useIsFocused, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

import { type AppNavigation, type MainTabParamList, type MapIncidentFocus } from '@lib/navigation';
import {
  useIncidentHistoryWindow,
  useRelayStatus,
  useSharedIncidents,
  useSharedLocation,
} from '@contexts';
import { useAppTheme, type ProcessedIncident } from '@hooks';
import { incidentsToFeatureCollection } from '@lib/map/types';
import {
  formatIncidentHistoryWindowLabel,
  INCIDENT_HISTORY_WINDOW_PRESETS,
} from '@lib/incidentHistoryWindow';
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
  historyWindowDays: number;
  historyWindowPresets: readonly number[];
  isHistoryWindowReady: boolean;
  activeDateRangeLabel: string;
  dateRangeStatusLabel: string;
  isDateRangeRefreshing: boolean;
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
  handleSelectDateRange: (days: number) => void;
  refreshLocation: () => void;
};

const DATE_RANGE_REFRESH_TIMEOUT_MS = 6000;

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

function getValidFocusCoordinate(focusIncident?: MapIncidentFocus): [number, number] | null {
  if (!focusIncident) {
    return null;
  }

  return getPointCoordinates(focusIncident.coordinate);
}

export function useMapScreenState(): MapScreenState {
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<RouteProp<MainTabParamList, 'Map'>>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const {
    historyWindowDays,
    isReady: isHistoryWindowReady,
    setHistoryWindowDays,
  } = useIncidentHistoryWindow();
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
  const [dateRangeTransition, setDateRangeTransition] = useState<{
    days: number;
    refreshStarted: boolean;
  } | null>(null);
  const fallbackClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackClearTimerRef.current) {
      clearTimeout(fallbackClearTimerRef.current);
      fallbackClearTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearFallbackTimer();
    };
  }, [clearFallbackTimer]);

  useEffect(() => {
    if (!dateRangeTransition) {
      return;
    }

    if (historyWindowDays !== dateRangeTransition.days) {
      return;
    }

    if (!hasReceivedHistory && !dateRangeTransition.refreshStarted) {
      setDateRangeTransition((current) =>
        current && current.days === dateRangeTransition.days
          ? { ...current, refreshStarted: true }
          : current
      );
      return;
    }

    if (hasReceivedHistory) {
      clearFallbackTimer();
      setDateRangeTransition(null);
    }
  }, [
    clearFallbackTimer,
    dateRangeTransition,
    hasReceivedHistory,
    historyWindowDays,
  ]);

  const camera = useMapCamera({ userLocation });
  const viewport = useMapViewportSubscription({
    isFocused,
    lastCameraZoomRef: camera.lastCameraZoomRef,
    setMapFocused,
    setMapSubscriptionAnchor,
    setMapSubscriptionViewport,
  });
  const focusIncident = route.params?.focusIncident;
  const focusCoordinate = getValidFocusCoordinate(focusIncident);

  useEffect(() => {
    if (!focusIncident || !focusCoordinate) {
      return;
    }

    camera.focusCoordinate(focusCoordinate);
  }, [
    camera.focusCoordinate,
    focusCoordinate,
    focusIncident,
  ]);

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

  const handleSelectDateRange = useCallback(
    (days: number) => {
      if (!isHistoryWindowReady || days === historyWindowDays) {
        return;
      }

      clearFallbackTimer();
      setDateRangeTransition({
        days,
        refreshStarted: false,
      });

      fallbackClearTimerRef.current = setTimeout(() => {
        setDateRangeTransition((current) =>
          current && current.days === days ? null : current
        );
        fallbackClearTimerRef.current = null;
      }, DATE_RANGE_REFRESH_TIMEOUT_MS);

      void setHistoryWindowDays(days).catch((error) => {
        console.warn('[MapScreen] Failed to save date range:', error);
        clearFallbackTimer();
        setDateRangeTransition(null);
      });
    },
    [
      clearFallbackTimer,
      historyWindowDays,
      isHistoryWindowReady,
      setHistoryWindowDays,
    ]
  );

  const relayStatus = buildRelayBannerStatus({
    hasConnectedRelay,
    hasRelays,
    isConnecting,
    relayLabel: formatRelayList(relays.map((relay) => relay.url)),
  });
  const selectedRefreshDays = dateRangeTransition?.days ?? historyWindowDays;
  const activeDateRangeLabel = formatIncidentHistoryWindowLabel(selectedRefreshDays);
  const dateRangeStatusLabel = !isHistoryWindowReady
    ? 'Loading saved date range...'
    : dateRangeTransition
      ? `Refreshing incidents for ${formatIncidentHistoryWindowLabel(selectedRefreshDays)} window...`
      : `Current range: ${activeDateRangeLabel}`;

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
    historyWindowDays,
    historyWindowPresets: INCIDENT_HISTORY_WINDOW_PRESETS,
    isHistoryWindowReady,
    activeDateRangeLabel,
    dateRangeStatusLabel,
    isDateRangeRefreshing: dateRangeTransition !== null,
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
    handleSelectDateRange,
    refreshLocation,
  };
}
