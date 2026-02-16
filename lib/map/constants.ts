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
  MAX_CACHE: 250,

  /**
   * Maximum number of events to fetch per subscription request
   * Higher values = more initial data but slower first load
   */
  FETCH_LIMIT: 100,

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
