/**
 * Map Configuration Constants
 *
 * This file contains configuration values for Mapbox map behavior
 * and incident data fetching/caching limits.
 */

// =============================================================================
// MAPBOX CONFIGURATION
// =============================================================================

/**
 * Mapbox map configuration constants
 */
export const MAPBOX_CONFIG = {
  /**
   * Default zoom level when centering on user location
   * Range: 0 (world) to 22 (building)
   */
  DEFAULT_ZOOM: 14,

  /**
   * Minimum zoom level (prevent zooming out too far)
   */
  MIN_ZOOM: 2,

  /**
   * Maximum zoom level (prevent zooming in too close)
   */
  MAX_ZOOM: 20,

  /**
   * Animation duration for camera movements (milliseconds)
   */
  ANIMATION_DURATION: 1000,

  /**
   * Pitch angle for 3D map tilt (degrees)
   * 0 = top-down, 60 = maximum tilt
   */
  DEFAULT_PITCH: 0,

  /**
   * Bearing angle for map rotation (degrees)
   * 0 = north up
   */
  DEFAULT_BEARING: 0,
} as const;

/**
 * Map-driven subscription tuning constants
 */
export const MAP_SUBSCRIPTION = {
  /**
   * Geohash precision used by relay-side `#g` filters.
   */
  GEOHASH_PRECISION: 6,

  /**
   * Number of geohash-cell rings around the center anchor.
   * 1 => 3x3 grid (9 cells), 2 => 5x5 grid (25 cells).
   */
  GEOHASH_GRID_RADIUS_CELLS: 2,

  /**
   * Grid planner mode.
   * - 'center-grid': builds a center radius grid from zoom tiers.
   * - 'viewport-ring': builds from current viewport cells, with center-grid
   *   fallback until the native map reports real bounds.
   */
  SUBSCRIPTION_PLANNER_MODE: 'viewport-ring' as const,

  /**
   * Number of additional rings to include as prefetch after computing visible cells.
   */
  SUBSCRIPTION_PREFETCH_RING: 0,

  /**
   * Hard cap for number of active subscription geohash cells.
   */
  MAX_ACTIVE_CELLS: 200,

  /**
   * Maximum geohash cells carried by one relay subscription filter.
   * Grouping keeps relay fan-out bounded while preserving raw-cell pruning.
   */
  MAX_CELLS_PER_GROUPED_SUBSCRIPTION: 8,

  /**
   * Allow small edge mismatch between viewport cells and active subscription grid
   * before showing a "zoom in" warning. Helps avoid false positives at default zoom.
   */
  VIEWPORT_SOFT_COVERAGE_MAX_MISSING_CELLS: 4,

  /**
   * Minimum coverage ratio for soft coverage mode.
   */
  VIEWPORT_SOFT_COVERAGE_MIN_RATIO: 0.8,

  /**
   * Existing active coverage may be reused for small pans when it still covers
   * most of the newly visible viewport. This avoids churn at geohash edges.
   */
  VIEWPORT_REUSE_MAX_MISSING_CELLS: 4,

  /**
   * Minimum visible-cell coverage required before reusing active subscriptions.
   */
  VIEWPORT_REUSE_MIN_RATIO: 0.9,

  /**
   * Zoom changes below this threshold can reuse active coverage if cells still
   * cover the viewport.
   */
  VIEWPORT_REUSE_MAX_ZOOM_DELTA: 0.5,

  /**
   * Zooming in by at least this much should create a focused refresh even when
   * the new viewport is technically covered by the prior geohash cells.
   */
  VIEWPORT_ZOOM_IN_REFRESH_MIN_DELTA: 0.25,

  /**
   * Wait this long after map idle before applying a viewport-driven subscription update.
   */
  VIEWPORT_UPDATE_DEBOUNCE_MS: 400,

  /**
   * Minimum interval between subscription-anchor updates to avoid churn.
   */
  VIEWPORT_MIN_UPDATE_INTERVAL_MS: 1200,
} as const;

// =============================================================================
// INCIDENT FETCHING & CACHING
// =============================================================================

/**
 * Incident data limits to prevent memory exhaustion and excessive network usage
 */
export const INCIDENT_LIMITS = {
  /**
   * Maximum number of incidents to keep in memory at once
   * Oldest incidents are evicted when this limit is exceeded (LRU strategy)
   */
  MAX_CACHE: 500,

  /**
   * Maximum number of events requested per active relay subscription filter.
   */
  FETCH_LIMIT: 200,

  /**
   * Upper bound for grouped subscription filters. A grouped query gets more
   * room than a single-cell query, but stays below the old per-cell fan-out.
   */
  GROUPED_FETCH_LIMIT_MAX: 600,

  /**
   * Per-cell fairness slice sent alongside grouped filters. This keeps one
   * subscription per grouped key while preventing dense cells from exhausting
   * the grouped relay limit before sparse cells can return recent events.
   */
  GROUPED_CELL_CATCH_UP_LIMIT: 25,

  /**
   * Maximum incidents rendered from the live subscription set.
   */
  MAX_VISIBLE: 200,

  /**
   * Marker feature cap while initial history is still loading.
   * Keeps cold-start map rendering light enough for navigation taps to stay responsive.
   */
  COLD_START_MAP_FEATURE_LIMIT: 50,

  /**
   * Maximum kind:30911 rows retained in the NDK SQLite cache.
   */
  MAX_NDK_INCIDENT_CACHE: 1000,

  /**
   * Internal upper bound for candidate incidents kept before pruning/sorting.
   */
  CANDIDATE_RETENTION: 600,

  /**
   * Hard cap for queued raw relay/cache events waiting to be flushed.
   */
  MAX_PENDING_QUEUE: 500,

  /**
   * Hard cap for candidate incidents parsed in a single reducer flush.
   */
  MAX_PARSE_CANDIDATES: 300,

  /**
   * Maximum raw incident event content length accepted before JSON parsing.
   */
  MAX_EVENT_CONTENT_LENGTH: 8192,

  /**
   * Maximum number of tags accepted on an incident event before queueing.
   */
  MAX_EVENT_TAGS: 24,

  /**
   * Maximum string length accepted for any individual tag value.
   */
  MAX_EVENT_TAG_VALUE_LENGTH: 256,

  /**
   * Maximum string length accepted for event ids before queueing.
   */
  MAX_EVENT_ID_LENGTH: 128,

  /**
   * How many days back to fetch incident events
   * Events older than this will not be requested
   */
  SINCE_DAYS: 30,

  /**
   * Minimum time between subscription refreshes (milliseconds)
   */
  REFRESH_DEBOUNCE_MS: 2000,
} as const;

// =============================================================================
// USER LOCATION
// =============================================================================

/**
 * User location marker configuration
 */
export const USER_LOCATION = {
  /**
   * Marker color for user's location (blue dot)
   */
  MARKER_COLOR: '#2563eb',

  /**
   * Marker size (diameter in pixels)
   */
  MARKER_SIZE: 20,

  /**
   * Border width around marker (pixels)
   */
  MARKER_BORDER_WIDTH: 3,

  /**
   * Border color (white for visibility on dark maps)
   */
  MARKER_BORDER_COLOR: '#fff',
} as const;

// =============================================================================
// INCIDENT MARKERS
// =============================================================================

/**
 * Incident marker styling configuration
 */
export const INCIDENT_MARKER = {
  /**
   * Marker pin diameter (pixels)
   */
  PIN_SIZE: 30,

  /**
   * Border width around pin (pixels)
   */
  PIN_BORDER_WIDTH: 2,

  /**
   * Border color (white for visibility)
   */
  PIN_BORDER_COLOR: '#fff',

  /**
   * Text color for severity number
   */
  TEXT_COLOR: '#fff',

  /**
   * Text font size (pixels)
   */
  TEXT_FONT_SIZE: 14,
} as const;
