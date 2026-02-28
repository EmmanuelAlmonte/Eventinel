/**
 * MapScreen
 *
 * Orchestrates state and selects the map rendering branch.
 */

import { MapSkeleton } from '@components/ui';
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
    refreshLocation,
  } = useMapScreenState();

  if (isLoadingLocation) {
    return <MapSkeleton />;
  }

  if (!userLocation) {
    return <MapScreenLocationRequired permission={permission} onRetry={refreshLocation} />;
  }

  if (!Mapbox) {
    return <MapScreenUnavailable />;
  }

  return (
    <MapScreenCanvas
      mapbox={Mapbox}
      camera={camera}
      viewport={viewport}
      colors={colors}
      insets={insets}
      relayStatus={relayStatus}
      userLocation={userLocation}
      incidentFeatureCollection={incidentFeatureCollection}
      hasReceivedHistory={hasReceivedHistory}
      visibleIncidents={visibleIncidents}
      isLoadingLocation={isLoadingLocation}
      isFocused={isFocused}
      isViewportCoveredBySubscriptionGrid={isViewportCoveredBySubscriptionGrid}
      locationSource={locationSource}
      permission={permission}
      handleMapLayout={handleMapLayout}
      handleRelaySettings={handleRelaySettings}
      onShapeSourcePress={handleShapeSourcePress}
      onFlyToUser={camera.handleFlyToUser}
    />
  );
}
