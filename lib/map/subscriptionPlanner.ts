import geohash from 'ngeohash';
import {
  buildGeohashGrid,
  encodeGeohashFromLngLat,
  getViewportGeohashes,
  type LngLat,
  type ViewportBounds,
} from './geohashViewport';

export type MapSubscriptionViewport = {
  center: [number, number];
  bounds: { ne: [number, number]; sw: [number, number] };
  zoom: number;
};

export type SubscriptionPlannerMode = 'center-grid' | 'viewport-ring';

interface PlanIncidentCellsOptions {
  mode: SubscriptionPlannerMode;
  precision: number;
  center: [number, number];
  bounds: ViewportBounds;
  zoom: number;
  maxCells: number;
  prefetchRing?: number;
}

export interface SubscriptionPlan {
  /** Cells required for viewport intent coverage */
  visibleCells: string[];
  /** Cells outside the visible set reserved for prefetch */
  prefetchCells: string[];
  /** Subscribed cells after applying cap policy */
  desiredCells: string[];
  /** Deterministic key for planner input equivalence */
  key: string;
  /** Indicates maxCells cap impacted requested coverage */
  truncated: boolean;
}

const EARTH_RADIUS_METERS = 6371000;
const DEFAULT_ZOOM_FALLBACK = 14;

function isFinitePair(value: LngLat | null | undefined): value is LngLat {
  return (
    !!value &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    Math.abs(value[1]) <= 90 &&
    Math.abs(value[0]) <= 180
  );
}

function normalizePrecision(precision: number): number {
  if (!Number.isFinite(precision)) {
    return 1;
  }

  const rounded = Math.max(1, Math.floor(precision));
  return Math.min(12, rounded);
}

function normalizeMaxCells(maxCells: number): number {
  if (!Number.isFinite(maxCells)) {
    return 0;
  }

  return Math.max(0, Math.floor(maxCells));
}

function isFiniteBounds(bounds: ViewportBounds): boolean {
  return isFinitePair(bounds?.ne) && isFinitePair(bounds?.sw);
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0))).sort();
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceMetersFromCoordinates(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a =
    sinLat * sinLat +
    Math.cos(radLat1) * Math.cos(radLat2) * sinLng * sinLng;

  const normalizedA = Math.min(1, Math.max(0, a));
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(normalizedA), Math.sqrt(1 - normalizedA));
}

function cellDistanceToCenter(cell: string, center: LngLat): number {
  const [lng, lat] = center;
  try {
    const decoded = geohash.decode(cell);
    return distanceMetersFromCoordinates(lat, lng, decoded.latitude, decoded.longitude);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function sortCellsByProximity(cells: string[], center: LngLat): string[] {
  return [...new Set(cells)].sort((left, right) => {
    const leftDistance = cellDistanceToCenter(left, center);
    const rightDistance = cellDistanceToCenter(right, center);

    if (leftDistance === rightDistance) {
      return left.localeCompare(right);
    }

    return leftDistance - rightDistance;
  });
}

function toNeighborArray(neighbors: string[] | Record<string, string>): string[] {
  if (Array.isArray(neighbors)) {
    return neighbors.filter((neighbor): neighbor is string => typeof neighbor === 'string');
  }

  return ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
    .map((key) => neighbors[key])
    .filter((neighbor): neighbor is string => typeof neighbor === 'string' && neighbor.length > 0);
}

function expandByRing(cells: string[], ring: number, center: LngLat): string[] {
  const radius = Math.max(0, Math.floor(ring));
  if (radius <= 0 || cells.length === 0) {
    return [];
  }

  const base = new Set(uniqueSorted(cells));
  const visited = new Set<string>(base);
  let frontier = new Set(base);

  for (let step = 0; step < radius; step += 1) {
    const next = new Set<string>();
    for (const cell of frontier) {
      const neighbors = geohash.neighbors(cell);
      const neighborValues = toNeighborArray(neighbors);
      for (const neighbor of neighborValues) {
        if (!neighbor) {
          continue;
        }
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          next.add(neighbor);
        }
      }
    }
    frontier = next;
    if (frontier.size === 0) {
      break;
    }
  }

  for (const cell of base) {
    visited.delete(cell);
  }

  return sortCellsByProximity(Array.from(visited), center);
}

function applyCapPolicy(
  visibleCells: string[],
  prefetchCells: string[],
  maxCells: number
): { desiredCells: string[]; truncated: boolean; selectedPrefetchCells: string[] } {
  const safeMax = Math.max(0, maxCells);
  if (safeMax >= visibleCells.length + prefetchCells.length) {
    return {
      desiredCells: [...visibleCells, ...prefetchCells],
      truncated: false,
      selectedPrefetchCells: prefetchCells,
    };
  }

  if (visibleCells.length >= safeMax) {
    return {
      desiredCells: visibleCells.slice(0, safeMax),
      truncated: true,
      selectedPrefetchCells: [],
    };
  }

  const spaceForPrefetch = safeMax - visibleCells.length;
  const selectedPrefetch = prefetchCells.slice(0, spaceForPrefetch);

  return {
    desiredCells: [...visibleCells, ...selectedPrefetch],
    truncated: true,
    selectedPrefetchCells: selectedPrefetch,
  };
}

/**
 * Pick zoom tier -> geohash grid radius.
 *
 * 14+ => radius 2 (legacy behavior at default zoom),
 * high zoom gets tighter coverage for fewer cells.
 */
export function computeCenterGridRadiusForZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    return 2;
  }

  if (zoom >= 16) {
    return 1;
  }
  if (zoom >= 14) {
    return 2;
  }
  if (zoom >= 12) {
    return 3;
  }
  if (zoom >= 10) {
    return 4;
  }
  return 5;
}

export function planIncidentCells(
  options: PlanIncidentCellsOptions
): SubscriptionPlan {
  const {
    mode,
    precision: rawPrecision,
    center,
    bounds,
    zoom,
    maxCells: rawMaxCells,
    prefetchRing: rawPrefetchRing,
  } = options;

  const precision = normalizePrecision(rawPrecision);
  const maxCells = normalizeMaxCells(rawMaxCells);
  const prefetchRing = Math.max(0, Math.floor(rawPrefetchRing || 0));
  const normalizedZoom = Number.isFinite(zoom) ? zoom : DEFAULT_ZOOM_FALLBACK;

  if (!isFinitePair(center) || !isFiniteBounds(bounds) || precision <= 0) {
    return {
      desiredCells: [],
      visibleCells: [],
      prefetchCells: [],
      key: `mode:${mode}|precision:${precision}|zoom:${normalizedZoom.toFixed(2)}|invalid`,
      truncated: false,
    };
  }

  let visibleCells: string[] = [];
  let prefetchCandidates: string[] = [];
  let modeRadius: number | null = null;

  const centerHash = encodeGeohashFromLngLat(center, precision);
  if (!centerHash) {
    return {
      desiredCells: [],
      visibleCells: [],
      prefetchCells: [],
      key: `mode:${mode}|precision:${precision}|zoom:${normalizedZoom.toFixed(2)}|invalid`,
      truncated: false,
    };
  }

  if (mode === 'center-grid') {
    modeRadius = computeCenterGridRadiusForZoom(normalizedZoom);
    visibleCells = buildGeohashGrid(centerHash, modeRadius);
    if (prefetchRing > 0) {
      prefetchCandidates = buildGeohashGrid(centerHash, modeRadius + prefetchRing).filter(
        (cell) => !visibleCells.includes(cell)
      );
    }
  } else {
    visibleCells = getViewportGeohashes(bounds, precision);
    if (prefetchRing > 0) {
      prefetchCandidates = expandByRing(visibleCells, prefetchRing, center);
    }
  }

  const sortedVisible = sortCellsByProximity(uniqueSorted(visibleCells), center);
  const sortedPrefetch = sortCellsByProximity(uniqueSorted(prefetchCandidates), center);

  const { desiredCells, selectedPrefetchCells, truncated } = applyCapPolicy(
    sortedVisible,
    sortedPrefetch,
    maxCells
  );

  const keyParts = [
    `mode:${mode}`,
    `precision:${precision}`,
    `zoom:${normalizedZoom.toFixed(2)}`,
    `radius:${modeRadius ?? 0}`,
    `max:${maxCells}`,
    `visible:${sortedVisible.length}`,
    `prefetch:${selectedPrefetchCells.length}`,
    `cells:${desiredCells.join('|')}`,
  ];

  return {
    visibleCells: sortedVisible,
    prefetchCells: selectedPrefetchCells,
    desiredCells,
    key: keyParts.join('|'),
    truncated,
  };
}
