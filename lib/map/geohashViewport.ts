import geohash from 'ngeohash';

export type LngLat = [number, number];

export interface ViewportBounds {
  ne: LngLat;
  sw: LngLat;
}

export interface ViewportCoverageResult {
  centerGeohash: string;
  subscriptionGrid: string[];
  viewportGeohashes: string[];
  coveredViewportCellCount: number;
  missingViewportCellCount: number;
  coverageRatio: number;
  isCoveredBySubscriptionGrid: boolean;
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

export function buildGeohashGrid(centerGeohash: string, radiusCells = 1): string[] {
  const normalizedRadius = Number.isFinite(radiusCells) ? Math.max(0, Math.floor(radiusCells)) : 0;
  let cells = new Set([centerGeohash]);

  for (let ring = 0; ring < normalizedRadius; ring++) {
    const expanded = new Set(cells);
    for (const cell of cells) {
      const neighbors = geohash.neighbors(cell);
      for (const neighbor of neighbors) {
        if (neighbor && neighbor.length > 0) {
          expanded.add(neighbor);
        }
      }
    }
    cells = expanded;
  }

  return uniqueSorted(Array.from(cells));
}

export function buildGeohashGrid9(centerGeohash: string): string[] {
  return buildGeohashGrid(centerGeohash, 1);
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
  precision: number,
  gridRadiusCells = 1
): ViewportCoverageResult | null {
  const centerGeohash = encodeGeohashFromLngLat(center, precision);
  if (!centerGeohash) {
    return null;
  }

  const subscriptionGrid = buildGeohashGrid(centerGeohash, gridRadiusCells);
  const viewportGeohashes = getViewportGeohashes(bounds, precision);
  if (viewportGeohashes.length === 0) {
    return null;
  }

  const gridSet = new Set(subscriptionGrid);
  let coveredViewportCellCount = 0;
  for (const cell of viewportGeohashes) {
    if (gridSet.has(cell)) {
      coveredViewportCellCount += 1;
    }
  }

  const missingViewportCellCount = viewportGeohashes.length - coveredViewportCellCount;
  const coverageRatio = coveredViewportCellCount / viewportGeohashes.length;
  const isCoveredBySubscriptionGrid = viewportGeohashes.every((cell) => gridSet.has(cell));

  return {
    centerGeohash,
    subscriptionGrid,
    viewportGeohashes,
    coveredViewportCellCount,
    missingViewportCellCount,
    coverageRatio,
    isCoveredBySubscriptionGrid,
  };
}
