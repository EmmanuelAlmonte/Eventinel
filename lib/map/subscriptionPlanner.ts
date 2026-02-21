import {
  buildGeohashGrid,
  encodeGeohashFromLngLat,
  getViewportGeohashes,
  type LngLat,
  type ViewportBounds,
} from './geohashViewport';
import {
  isFiniteLngLat,
  uniqueSorted,
  sortCellsByProximity,
  expandCellsByRing,
} from './subscriptionPlannerCells';

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

const DEFAULT_ZOOM_FALLBACK = 14;

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
  return isFiniteLngLat(bounds?.ne) && isFiniteLngLat(bounds?.sw);
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

function buildInvalidPlan(
  mode: SubscriptionPlannerMode,
  precision: number,
  zoom: number
): SubscriptionPlan {
  return {
    desiredCells: [],
    visibleCells: [],
    prefetchCells: [],
    key: `mode:${mode}|precision:${precision}|zoom:${zoom.toFixed(2)}|invalid`,
    truncated: false,
  };
}

function deriveRequestedCells(options: {
  mode: SubscriptionPlannerMode;
  center: LngLat;
  bounds: ViewportBounds;
  zoom: number;
  precision: number;
  prefetchRing: number;
}): {
  visibleCells: string[];
  prefetchCandidates: string[];
  modeRadius: number | null;
} {
  const {
    mode,
    center,
    bounds,
    zoom,
    precision,
    prefetchRing,
  } = options;
  const centerHash = encodeGeohashFromLngLat(center, precision);

  if (!centerHash) {
    return { visibleCells: [], prefetchCandidates: [], modeRadius: null };
  }

  if (mode === 'center-grid') {
    const modeRadius = computeCenterGridRadiusForZoom(zoom);
    const visibleCells = buildGeohashGrid(centerHash, modeRadius);
    const prefetchCandidates =
      prefetchRing > 0
        ? buildGeohashGrid(centerHash, modeRadius + prefetchRing).filter(
            (cell) => !visibleCells.includes(cell)
          )
        : [];

    return { visibleCells, prefetchCandidates, modeRadius };
  }

  const visibleCells = getViewportGeohashes(bounds, precision);
  const prefetchCandidates =
    prefetchRing > 0
      ? expandCellsByRing(visibleCells, prefetchRing, center)
      : [];

  return { visibleCells, prefetchCandidates, modeRadius: null };
}

function buildPlanKey(input: {
  mode: SubscriptionPlannerMode;
  precision: number;
  zoom: number;
  modeRadius: number | null;
  maxCells: number;
  visibleCount: number;
  prefetchCount: number;
  desiredCells: string[];
}): string {
  const {
    mode,
    precision,
    zoom,
    modeRadius,
    maxCells,
    visibleCount,
    prefetchCount,
    desiredCells,
  } = input;

  return [
    `mode:${mode}`,
    `precision:${precision}`,
    `zoom:${zoom.toFixed(2)}`,
    `radius:${modeRadius ?? 0}`,
    `max:${maxCells}`,
    `visible:${visibleCount}`,
    `prefetch:${prefetchCount}`,
    `cells:${desiredCells.join('|')}`,
  ].join('|');
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

  if (!isFiniteLngLat(center) || !isFiniteBounds(bounds) || precision <= 0) {
    return buildInvalidPlan(mode, precision, normalizedZoom);
  }

  const {
    visibleCells,
    prefetchCandidates,
    modeRadius,
  } = deriveRequestedCells({
    mode,
    center,
    bounds,
    zoom: normalizedZoom,
    precision,
    prefetchRing,
  });

  if (visibleCells.length === 0 && prefetchCandidates.length === 0) {
    return buildInvalidPlan(mode, precision, normalizedZoom);
  }

  const sortedVisible = sortCellsByProximity(uniqueSorted(visibleCells), center);
  const sortedPrefetch = sortCellsByProximity(uniqueSorted(prefetchCandidates), center);

  const { desiredCells, selectedPrefetchCells, truncated } = applyCapPolicy(
    sortedVisible,
    sortedPrefetch,
    maxCells
  );

  return {
    visibleCells: sortedVisible,
    prefetchCells: selectedPrefetchCells,
    desiredCells,
    key: buildPlanKey({
      mode,
      precision,
      zoom: normalizedZoom,
      modeRadius,
      maxCells,
      visibleCount: sortedVisible.length,
      prefetchCount: selectedPrefetchCells.length,
      desiredCells,
    }),
    truncated,
  };
}
