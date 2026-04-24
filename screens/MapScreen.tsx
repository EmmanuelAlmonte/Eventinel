/**
 * MapScreen
 *
 * Orchestrates state and selects the map rendering branch.
 */

import { useEffect, useRef, useState } from 'react';

import { MapSkeleton } from '@components/ui';
import { useStartupNavigationInteraction } from '@contexts';
import { automationTestID } from '@lib/utils';
import { Mapbox } from './map/config';
import { MapScreenCanvas } from './map/MapScreenCanvas';
import { MapScreenLocationRequired, MapScreenUnavailable } from './map/MapScreenStates';
import { useMapScreenState } from './map/useMapScreenState';

const INITIAL_MAP_RENDER_DELAY_MS = 8000;

function useInitialMapRenderGate(
  userLocation: [number, number] | null,
  isFocused: boolean,
  hasStartupMapRequest: boolean
) {
  const [isMapRenderAllowed, setIsMapRenderAllowed] = useState(false);
  const hasReleasedInitialRenderRef = useRef(false);

  useEffect(() => {
    if (!userLocation) {
      if (!hasReleasedInitialRenderRef.current) {
        setIsMapRenderAllowed(false);
      }
      return;
    }

    if (hasReleasedInitialRenderRef.current) {
      setIsMapRenderAllowed(true);
      return;
    }

    if (!isFocused) {
      return;
    }

    if (hasStartupMapRequest) {
      hasReleasedInitialRenderRef.current = true;
      setIsMapRenderAllowed(true);
      return;
    }

    setIsMapRenderAllowed(false);
    const timer = setTimeout(() => {
      hasReleasedInitialRenderRef.current = true;
      setIsMapRenderAllowed(true);
    }, INITIAL_MAP_RENDER_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [hasStartupMapRequest, isFocused, userLocation]);

  return isMapRenderAllowed;
}

export default function MapScreen() {
  const { hasStartupMapRequest } = useStartupNavigationInteraction();
  const {
    colors,
    insets,
    relayStatus,
    userLocation,
    hasReceivedHistory,
    historyWindowDays,
    historyWindowPresets,
    isHistoryWindowReady,
    activeDateRangeLabel,
    dateRangeStatusLabel,
    isDateRangeRefreshing,
    visibleIncidents,
    incidentFeatureCollection,
    isLoadingLocation,
    isFocused,
    isViewportCoveredBySubscriptionGrid,
    permission,
    camera,
    viewport,
    locationSource,
    handleShapeSourcePress,
    handleMapLayout,
    handleRelaySettings,
    handleSelectDateRange,
    refreshLocation,
  } = useMapScreenState();
  const isInitialMapRenderAllowed = useInitialMapRenderGate(
    userLocation,
    isFocused,
    hasStartupMapRequest
  );

  if (isLoadingLocation) {
    return <MapSkeleton testID={automationTestID('screen-map')} />;
  }

  if (!userLocation) {
    return <MapScreenLocationRequired permission={permission} onRetry={refreshLocation} />;
  }

  if (!Mapbox) {
    return <MapScreenUnavailable />;
  }

  if (!isInitialMapRenderAllowed) {
    return <MapSkeleton animation="none" testID={automationTestID('screen-map')} />;
  }

  return (
    <MapScreenCanvas
      testID={automationTestID('screen-map')}
      mapbox={Mapbox}
      camera={camera}
      viewport={viewport}
      colors={colors}
      insets={insets}
      relayStatus={relayStatus}
      userLocation={userLocation}
      incidentFeatureCollection={incidentFeatureCollection}
      hasReceivedHistory={hasReceivedHistory}
      historyWindowDays={historyWindowDays}
      historyWindowPresets={historyWindowPresets}
      isHistoryWindowReady={isHistoryWindowReady}
      activeDateRangeLabel={activeDateRangeLabel}
      dateRangeStatusLabel={dateRangeStatusLabel}
      isDateRangeRefreshing={isDateRangeRefreshing}
      visibleIncidents={visibleIncidents}
      isLoadingLocation={isLoadingLocation}
      isFocused={isFocused}
      isViewportCoveredBySubscriptionGrid={isViewportCoveredBySubscriptionGrid}
      locationSource={locationSource}
      permission={permission}
      handleMapLayout={handleMapLayout}
      handleRelaySettings={handleRelaySettings}
      onSelectDateRange={handleSelectDateRange}
      onShapeSourcePress={handleShapeSourcePress}
      onFlyToUser={camera.handleFlyToUser}
    />
  );
}
