/**
 * MapScreen
 *
 * Orchestrates state and selects the map rendering branch.
 */

import { MapSkeleton } from '@components/ui';
import { automationTestID } from '@lib/utils';
import { Mapbox } from './map/config';
import { MapScreenCanvas } from './map/MapScreenCanvas';
import { MapScreenLocationRequired, MapScreenUnavailable } from './map/MapScreenStates';
import { useMapScreenState } from './map/useMapScreenState';

export default function MapScreen() {
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

  if (isLoadingLocation) {
    return <MapSkeleton testID={automationTestID('screen-map')} />;
  }

  if (!userLocation) {
    return <MapScreenLocationRequired permission={permission} onRetry={refreshLocation} />;
  }

  if (!Mapbox) {
    return <MapScreenUnavailable />;
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
