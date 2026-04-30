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

export interface IncidentSubscriptionGroup {
  /** Stable key used for reconcile, EOSE, and debug accounting */
  key: string;
  /** Raw relay-side geohash filters included in this subscription */
  cells: string[];
}

const DEFAULT_ZOOM_FALLBACK = 14;
const GROUPED_SUBSCRIPTION_KEY_PREFIX = 'g:';
const GEOHASH_BASE32_ALPHABET = '0123456789bcdefghjkmnpqrstuvwxyz';

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

function normalizeMaxCellsPerGroup(maxCellsPerGroup: number): number {
  if (!Number.isFinite(maxCellsPerGroup)) {
    return 1;
  }

  return Math.max(1, Math.floor(maxCellsPerGroup));
}

function isFiniteBounds(bounds: ViewportBounds): boolean {
  return isFiniteLngLat(bounds?.ne) && isFiniteLngLat(bounds?.sw);
}

function isPointBounds(bounds: ViewportBounds): boolean {
  return bounds.ne[0] === bounds.sw[0] && bounds.ne[1] === bounds.sw[1];
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

  const viewportCells = getViewportGeohashes(bounds, precision);
  const shouldUseCenterFallback = viewportCells.length <= 1 && isPointBounds(bounds);
  if (shouldUseCenterFallback) {
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

  const visibleCells = viewportCells;
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

export function buildIncidentSubscriptionGroupKey(cells: readonly string[]): string {
  if (cells.length === 1) {
    return cells[0];
  }

  return `${GROUPED_SUBSCRIPTION_KEY_PREFIX}${cells.join(',')}`;
}

export interface VisibleCellCoverageSummary {
  visibleCellCount: number;
  desiredCellCount: number;
  coveredVisibleCellCount: number;
  missingVisibleCellCount: number;
  coverageRatio: number;
  isCovered: boolean;
}

export function summarizeVisibleCellCoverage(
  visibleCells: readonly string[],
  desiredCells: readonly string[]
): VisibleCellCoverageSummary {
  const normalizedVisibleCells = uniqueSorted(
    visibleCells.map((cell) => cell.trim().toLowerCase()).filter(Boolean)
  );
  const desiredSet = new Set(
    desiredCells.map((cell) => cell.trim().toLowerCase()).filter(Boolean)
  );

  let coveredVisibleCellCount = 0;
  for (const cell of normalizedVisibleCells) {
    if (desiredSet.has(cell)) {
      coveredVisibleCellCount += 1;
    }
  }

  const missingVisibleCellCount = normalizedVisibleCells.length - coveredVisibleCellCount;
  const coverageRatio =
    normalizedVisibleCells.length === 0
      ? 1
      : coveredVisibleCellCount / normalizedVisibleCells.length;

  return {
    visibleCellCount: normalizedVisibleCells.length,
    desiredCellCount: desiredSet.size,
    coveredVisibleCellCount,
    missingVisibleCellCount,
    coverageRatio,
    isCovered: missingVisibleCellCount === 0,
  };
}

export function isVisibleCellCoverageAcceptable(
  coverage: VisibleCellCoverageSummary,
  options: {
    maxMissingCells: number;
    minCoverageRatio: number;
  }
): boolean {
  if (coverage.visibleCellCount === 0) {
    return false;
  }

  return (
    coverage.isCovered ||
    (coverage.missingVisibleCellCount <= options.maxMissingCells &&
      coverage.coverageRatio >= options.minCoverageRatio)
  );
}

export function shouldReuseIncidentSubscriptionPlanForViewport(options: {
  activeDesiredCells: readonly string[] | null;
  nextVisibleCells: readonly string[];
  previousZoom: number | null;
  nextZoom: number;
  maxMissingCells: number;
  minCoverageRatio: number;
  maxZoomDelta: number;
}): boolean {
  const {
    activeDesiredCells,
    nextVisibleCells,
    previousZoom,
    nextZoom,
    maxMissingCells,
    minCoverageRatio,
    maxZoomDelta,
  } = options;

  if (!activeDesiredCells || activeDesiredCells.length === 0) {
    return false;
  }

  if (
    previousZoom != null &&
    Number.isFinite(previousZoom) &&
    Number.isFinite(nextZoom) &&
    Math.abs(nextZoom - previousZoom) > maxZoomDelta
  ) {
    return false;
  }

  return isVisibleCellCoverageAcceptable(
    summarizeVisibleCellCoverage(nextVisibleCells, activeDesiredCells),
    { maxMissingCells, minCoverageRatio }
  );
}

export function parseIncidentSubscriptionGroupKey(key: string): string[] {
  if (!key.startsWith(GROUPED_SUBSCRIPTION_KEY_PREFIX)) {
    return [key.toLowerCase()];
  }

  return key
    .slice(GROUPED_SUBSCRIPTION_KEY_PREFIX.length)
    .split(',')
    .map((cell) => cell.trim().toLowerCase())
    .filter(Boolean);
}

function getStableGroupBucketKey(cell: string, maxCellsPerGroup: number): string {
  if (cell.length === 0) {
    return '';
  }

  const parentPrefix = cell.slice(0, -1);
  const bucketChar = cell[cell.length - 1];
  const bucketCharIndex = GEOHASH_BASE32_ALPHABET.indexOf(bucketChar);
  if (bucketCharIndex < 0) {
    return `${parentPrefix}|${bucketChar}`;
  }

  const bucketStart = Math.floor(bucketCharIndex / maxCellsPerGroup) * maxCellsPerGroup;
  return `${parentPrefix}|${bucketStart.toString().padStart(2, '0')}`;
}

export function groupIncidentSubscriptionCells(
  desiredCells: readonly string[],
  maxCellsPerGroup: number
): IncidentSubscriptionGroup[] {
  const safeGroupSize = normalizeMaxCellsPerGroup(maxCellsPerGroup);
  const normalizedCells = uniqueSorted(
    desiredCells
      .map((cell) => cell.trim().toLowerCase())
      .filter(Boolean)
  );
  const cellsByBucket = new Map<string, string[]>();
  for (const cell of normalizedCells) {
    const bucketKey = getStableGroupBucketKey(cell, safeGroupSize);
    const bucket = cellsByBucket.get(bucketKey) ?? [];
    bucket.push(cell);
    cellsByBucket.set(bucketKey, bucket);
  }

  const groups: IncidentSubscriptionGroup[] = [];
  for (const bucketKey of Array.from(cellsByBucket.keys()).sort()) {
    const bucketCells = cellsByBucket.get(bucketKey) ?? [];
    for (let index = 0; index < bucketCells.length; index += safeGroupSize) {
      const cells = bucketCells.slice(index, index + safeGroupSize);
      groups.push({
        key: buildIncidentSubscriptionGroupKey(cells),
        cells,
      });
    }
  }

  return groups;
}
