import { StyleSheet } from 'react-native';

import { INCIDENT_MARKER, USER_LOCATION } from '@lib/map/constants';

export const mapScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapUnavailableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  mapUnavailableSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  userMarker: {
    width: USER_LOCATION.MARKER_SIZE,
    height: USER_LOCATION.MARKER_SIZE,
    borderRadius: USER_LOCATION.MARKER_SIZE / 2,
    backgroundColor: USER_LOCATION.MARKER_COLOR,
    borderWidth: USER_LOCATION.MARKER_BORDER_WIDTH,
    borderColor: USER_LOCATION.MARKER_BORDER_COLOR,
  },
  statsOverlay: {
    position: 'absolute',
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    color: '#ccc',
    fontSize: 13,
    textAlign: 'center',
  },
  viewportHint: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.88)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewportHintText: {
    color: '#f9fafb',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  relayBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  relayBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  relayBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  relayBannerDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  relayBannerActionContainer: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  relayBannerActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  flyToButton: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  flyToButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  locationDebugOverlay: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
  },
  locationSourceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationSourceFresh: {
    color: '#22c55e',
  },
  locationSourceCached: {
    color: '#eab308',
  },
  locationSourceDefault: {
    color: '#ef4444',
  },
  locationDebugText: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});

export const mapLayerStyles = {
  clusterCircleStyle: {
    circleColor: [
      'step',
      ['get', 'point_count'],
      '#c4b5fd',
      10,
      '#a78bfa',
      25,
      '#8b5cf6',
      50,
      '#6d28d9',
    ] as const,
    circleRadius: [
      'step',
      ['get', 'point_count'],
      18,
      10,
      22,
      25,
      26,
      50,
      30,
    ] as const,
    circleStrokeColor: INCIDENT_MARKER.PIN_BORDER_COLOR,
    circleStrokeWidth: INCIDENT_MARKER.PIN_BORDER_WIDTH,
    circleOpacity: 0.9,
  },
  clusterCountStyle: {
    textField: ['get', 'point_count_abbreviated'] as const,
    textSize: 12,
    textColor: '#ffffff',
    textAllowOverlap: true,
    textIgnorePlacement: true,
  },
};
