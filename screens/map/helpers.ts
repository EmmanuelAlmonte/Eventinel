import type { LngLat } from '@lib/map/geohashViewport';
import type { RelayBannerStatus } from '@lib/relay/helpers';
import { buildRelayBannerStatus, formatRelayList } from '@lib/relay/helpers';

export { buildRelayBannerStatus, formatRelayList };
export type { RelayBannerStatus };

type MapProperties = {
  zoom?: number;
  zoomLevel?: number;
  camera?: {
    zoom?: number;
    zoomLevel?: number;
  };
};

export function extractZoomFromProperties(properties?: MapProperties): number | null {
  const zoomCandidates = [
    properties?.zoom,
    properties?.zoomLevel,
    properties?.camera?.zoom,
    properties?.camera?.zoomLevel,
  ];

  for (const candidate of zoomCandidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function isLngLat(value: unknown): value is LngLat {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }
  return Number.isFinite(value[0]) && Number.isFinite(value[1]);
}
