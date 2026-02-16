import geohash from 'ngeohash';

export type LngLat = [number, number];

export interface ViewportBounds {
  ne: LngLat;
  sw: LngLat;
}

export interface ViewportCoverageResult {
  centerGeohash: string;
  grid9: string[];
  viewportGeohashes: string[];
  isCoveredByGrid9: boolean;
}

function isFiniteLngLat(value: LngLat | null | undefined): value is LngLat {
  return !!value && Number.isFinite(value[0]) && Number.isFinite(value[1]);
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0))).sort();
}

export function encodeGeohashFromLngLat(value: LngLat, precision: number): string | null {
  if (!isFiniteLngLat(value)) {
    return null;
  }

  const [lng, lat] = value;
  return geohash.encode(lat, lng, precision);
}

export function buildGeohashGrid9(centerGeohash: string): string[] {
  const neighbors = geohash.neighbors(centerGeohash);
  return uniqueSorted([centerGeohash, ...neighbors]);
}

export function getViewportGeohashes(bounds: ViewportBounds, precision: number): string[] {
  const { ne, sw } = bounds;
  if (!isFiniteLngLat(ne) || !isFiniteLngLat(sw)) {
    return [];
  }

  const [neLng, neLat] = ne;
  const [swLng, swLat] = sw;

  const minLat = Math.min(swLat, neLat);
  const maxLat = Math.max(swLat, neLat);

  if (swLng <= neLng) {
    return uniqueSorted(geohash.bboxes(minLat, swLng, maxLat, neLng, precision));
  }

  // The viewport crosses the anti-meridian; split into two longitude intervals.
  const westHemisphere = geohash.bboxes(minLat, swLng, maxLat, 180, precision);
  const eastHemisphere = geohash.bboxes(minLat, -180, maxLat, neLng, precision);
  return uniqueSorted([...westHemisphere, ...eastHemisphere]);
}

export function evaluateViewportCoverage(
  bounds: ViewportBounds,
  center: LngLat,
  precision: number
): ViewportCoverageResult | null {
  const centerGeohash = encodeGeohashFromLngLat(center, precision);
  if (!centerGeohash) {
    return null;
  }

  const grid9 = buildGeohashGrid9(centerGeohash);
  const viewportGeohashes = getViewportGeohashes(bounds, precision);
  if (viewportGeohashes.length === 0) {
    return null;
  }

  const gridSet = new Set(grid9);
  const isCoveredByGrid9 = viewportGeohashes.every((cell) => gridSet.has(cell));

  return {
    centerGeohash,
    grid9,
    viewportGeohashes,
    isCoveredByGrid9,
  };
}
